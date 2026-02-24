from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.db.models import User, ColorProfile
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


@router.get("", response_model=ColorProfileResponse)
async def get_color_profile(
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Get the color profile for the current user."""
    user = get_user_by_uid(x_firebase_uid, db)

    color_profile = db.query(ColorProfile).filter(ColorProfile.user_id == user.id).first()

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
    """Create a new color profile. Only one profile per user."""
    user = get_user_by_uid(x_firebase_uid, db)

    # Check if profile already exists
    existing = db.query(ColorProfile).filter(ColorProfile.user_id == user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Color profile already exists. Use PUT to update.",
        )

    # Create new color profile
    color_profile = ColorProfile(
        user_id=user.id,
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


@router.put("", response_model=ColorProfileResponse)
async def update_color_profile(
    data: ColorProfileUpdate,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Update the color profile for the current user."""
    user = get_user_by_uid(x_firebase_uid, db)

    color_profile = db.query(ColorProfile).filter(ColorProfile.user_id == user.id).first()

    if not color_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Color profile not found. Use POST to create.",
        )

    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(color_profile, field, value)

    db.commit()
    db.refresh(color_profile)

    return color_profile


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_color_profile(
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Delete the color profile for the current user."""
    user = get_user_by_uid(x_firebase_uid, db)

    color_profile = db.query(ColorProfile).filter(ColorProfile.user_id == user.id).first()

    if not color_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Color profile not found",
        )

    db.delete(color_profile)
    db.commit()

    return None
