from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional, List

from app.db.database import get_db
from app.db.models import User, MeasurementProfile
from app.models.measurement import MeasurementCreate, MeasurementUpdate, MeasurementResponse

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


@router.get("", response_model=List[MeasurementResponse])
async def get_measurements(
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Get all measurement profiles for the current user."""
    user = get_user_by_uid(x_firebase_uid, db)
    measurements = (
        db.query(MeasurementProfile)
        .filter(MeasurementProfile.user_id == user.id)
        .order_by(MeasurementProfile.is_primary.desc(), MeasurementProfile.created_at.desc())
        .all()
    )
    return measurements


@router.post("", response_model=MeasurementResponse, status_code=status.HTTP_201_CREATED)
async def create_measurement(
    data: MeasurementCreate,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Create a new measurement profile. First profile is auto-set as primary."""
    user = get_user_by_uid(x_firebase_uid, db)

    # First profile is auto-primary, or respect explicit is_primary
    existing_count = (
        db.query(MeasurementProfile)
        .filter(MeasurementProfile.user_id == user.id)
        .count()
    )
    set_primary = data.is_primary if data.is_primary is not None else (existing_count == 0)

    # If setting as primary, unset all others
    if set_primary and existing_count > 0:
        db.query(MeasurementProfile).filter(
            MeasurementProfile.user_id == user.id,
        ).update({"is_primary": False})

    measurement = MeasurementProfile(
        user_id=user.id,
        name=data.name,
        height=data.height,
        weight=data.weight,
        chest=data.chest,
        waist=data.waist,
        hip=data.hip,
        inseam=data.inseam,
        shoulder_width=data.shoulder_width,
        arm_length=data.arm_length,
        is_primary=set_primary,
        source="MANUAL",
    )

    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return measurement


@router.put("/{measurement_id}", response_model=MeasurementResponse)
async def update_measurement(
    measurement_id: str,
    data: MeasurementUpdate,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Update a measurement profile."""
    user = get_user_by_uid(x_firebase_uid, db)

    measurement = (
        db.query(MeasurementProfile)
        .filter(
            MeasurementProfile.id == measurement_id,
            MeasurementProfile.user_id == user.id,
        )
        .first()
    )

    if not measurement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Measurement profile not found",
        )

    # If setting as primary, unset all other primaries for this user
    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("is_primary"):
        db.query(MeasurementProfile).filter(
            MeasurementProfile.user_id == user.id,
            MeasurementProfile.id != measurement_id,
        ).update({"is_primary": False})

    # Update fields if provided
    for field, value in update_data.items():
        setattr(measurement, field, value)

    db.commit()
    db.refresh(measurement)
    return measurement


@router.delete("/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_measurement(
    measurement_id: str,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Delete a measurement profile."""
    user = get_user_by_uid(x_firebase_uid, db)

    measurement = (
        db.query(MeasurementProfile)
        .filter(
            MeasurementProfile.id == measurement_id,
            MeasurementProfile.user_id == user.id,
        )
        .first()
    )

    if not measurement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Measurement profile not found",
        )

    was_primary = measurement.is_primary
    db.delete(measurement)
    db.commit()

    # If deleted profile was primary, set the next one as primary
    if was_primary:
        next_profile = (
            db.query(MeasurementProfile)
            .filter(MeasurementProfile.user_id == user.id)
            .order_by(MeasurementProfile.created_at.asc())
            .first()
        )
        if next_profile:
            next_profile.is_primary = True
            db.commit()

    return None
