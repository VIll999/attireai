from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional, List

from app.db.database import get_db
from app.db.models import User, ColorProfile, MeasurementProfile
from app.models.color_profile import ColorProfileCreate, ColorProfileUpdate, ColorProfileResponse
from app.utils.color_analysis import generate_color_recommendations

router = APIRouter()


def get_user_by_uid(firebase_uid: str, db: Session) -> User:
    """Helper to get user by Firebase UID or raise 401/404."""
    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Firebase UID header",
        )
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.get("", response_model=List[ColorProfileResponse])
async def get_color_profiles(
    x_firebase_uid: Optional[str] = Header(None),
    measurement_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get all color profiles for the current user, optionally filtered by measurement_id."""
    user = get_user_by_uid(x_firebase_uid, db)

    query = db.query(ColorProfile).filter(ColorProfile.user_id == user.id)

    if measurement_id:
        query = query.filter(ColorProfile.measurement_id == measurement_id)

    color_profiles = query.all()

    # Enrich with measurement names
    result = []
    for profile in color_profiles:
        profile_dict = {
            "id": profile.id,
            "user_id": profile.user_id,
            "measurement_id": profile.measurement_id,
            "skin_tone": profile.skin_tone,
            "skin_tone_hex": profile.skin_tone_hex,
            "hair_color": profile.hair_color,
            "hair_color_hex": profile.hair_color_hex,
            "recommended_palette": profile.recommended_palette,
            "photo_url": profile.photo_url,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at,
            "measurement_name": None
        }

        # Get measurement name
        if profile.measurement_id:
            measurement = db.query(MeasurementProfile).filter(
                MeasurementProfile.id == profile.measurement_id
            ).first()
            if measurement:
                profile_dict["measurement_name"] = measurement.name

        result.append(profile_dict)

    return result


@router.get("/{profile_id}", response_model=ColorProfileResponse)
async def get_color_profile(
    profile_id: str,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Get a specific color profile by ID."""
    user = get_user_by_uid(x_firebase_uid, db)

    color_profile = db.query(ColorProfile).filter(
        ColorProfile.id == profile_id,
        ColorProfile.user_id == user.id
    ).first()

    if not color_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Color profile not found",
        )

    # Enrich with measurement name
    profile_dict = {
        "id": color_profile.id,
        "user_id": color_profile.user_id,
        "measurement_id": color_profile.measurement_id,
        "skin_tone": color_profile.skin_tone,
        "skin_tone_hex": color_profile.skin_tone_hex,
        "hair_color": color_profile.hair_color,
        "hair_color_hex": color_profile.hair_color_hex,
        "recommended_palette": color_profile.recommended_palette,
        "photo_url": color_profile.photo_url,
        "created_at": color_profile.created_at,
        "updated_at": color_profile.updated_at,
        "measurement_name": None
    }

    # Get measurement name
    if color_profile.measurement_id:
        measurement = db.query(MeasurementProfile).filter(
            MeasurementProfile.id == color_profile.measurement_id
        ).first()
        if measurement:
            profile_dict["measurement_name"] = measurement.name

    return profile_dict


@router.post("", response_model=ColorProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_color_profile(
    data: ColorProfileCreate,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Create a new color profile."""
    user = get_user_by_uid(x_firebase_uid, db)

    # Validate measurement_id belongs to user (required)
    measurement = db.query(MeasurementProfile).filter(
        MeasurementProfile.id == data.measurement_id,
        MeasurementProfile.user_id == user.id
    ).first()
    if not measurement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Measurement profile not found",
        )

    # Auto-generate recommended palette if both skin_tone_hex and hair_color_hex are provided
    recommended_palette = data.recommended_palette
    if data.skin_tone_hex and data.hair_color_hex and not recommended_palette:
        try:
            recommended_palette = generate_color_recommendations(
                data.skin_tone_hex,
                data.hair_color_hex
            )
        except Exception as e:
            print(f"Error generating color recommendations: {e}")
            # Continue without recommendations if generation fails
            recommended_palette = None

    # Create new color profile
    color_profile = ColorProfile(
        user_id=user.id,
        measurement_id=data.measurement_id,
        skin_tone=data.skin_tone,
        skin_tone_hex=data.skin_tone_hex,
        hair_color=data.hair_color,
        hair_color_hex=data.hair_color_hex,
        recommended_palette=recommended_palette,
        photo_url=data.photo_url,
    )

    db.add(color_profile)
    db.commit()
    db.refresh(color_profile)

    return color_profile


@router.put("/{profile_id}", response_model=ColorProfileResponse)
async def update_color_profile(
    profile_id: str,
    data: ColorProfileUpdate,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Update a specific color profile."""
    user = get_user_by_uid(x_firebase_uid, db)

    color_profile = db.query(ColorProfile).filter(
        ColorProfile.id == profile_id,
        ColorProfile.user_id == user.id
    ).first()

    if not color_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Color profile not found",
        )

    # Validate measurement_id belongs to user if provided
    if data.measurement_id:
        measurement = db.query(MeasurementProfile).filter(
            MeasurementProfile.id == data.measurement_id,
            MeasurementProfile.user_id == user.id
        ).first()
        if not measurement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Measurement profile not found",
            )

    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(color_profile, field, value)

    # Regenerate recommended palette if skin_tone_hex or hair_color_hex changed
    # and both are now available
    if (('skin_tone_hex' in update_data or 'hair_color_hex' in update_data) and
        color_profile.skin_tone_hex and color_profile.hair_color_hex):
        try:
            recommended_palette = generate_color_recommendations(
                color_profile.skin_tone_hex,
                color_profile.hair_color_hex
            )
            color_profile.recommended_palette = recommended_palette
        except Exception as e:
            print(f"Error generating color recommendations: {e}")
            # Continue without updating recommendations if generation fails

    db.commit()
    db.refresh(color_profile)

    return color_profile


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_color_profile(
    profile_id: str,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Delete a specific color profile."""
    user = get_user_by_uid(x_firebase_uid, db)

    color_profile = db.query(ColorProfile).filter(
        ColorProfile.id == profile_id,
        ColorProfile.user_id == user.id
    ).first()

    if not color_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Color profile not found",
        )

    db.delete(color_profile)
    db.commit()

    return None
