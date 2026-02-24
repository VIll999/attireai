from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional, List

from app.db.database import get_db
from app.db.models import User, ColorProfile, MeasurementProfile
from app.models.color_profile import ColorProfileCreate, ColorProfileUpdate, ColorProfileResponse

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
    db: Session = Depends(get_db),
):
    """Get all color profiles for the current user."""
    user = get_user_by_uid(x_firebase_uid, db)

    color_profiles = db.query(ColorProfile).filter(ColorProfile.user_id == user.id).all()

    return color_profiles


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

    return color_profile


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

    # Create new color profile
    color_profile = ColorProfile(
        user_id=user.id,
        measurement_id=data.measurement_id,
        skin_tone=data.skin_tone,
        skin_tone_hex=data.skin_tone_hex,
        hair_color=data.hair_color,
        hair_color_hex=data.hair_color_hex,
        recommended_palette=data.recommended_palette,
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
