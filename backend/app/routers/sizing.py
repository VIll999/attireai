from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.db.models import User, MeasurementProfile
from app.services.sizing import get_size_recommendations

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


@router.get("/recommendations")
async def get_sizing_recommendations(
    measurement_id: str = Query(..., description="Measurement profile ID"),
    gender: str = Query("male", description="Gender for sizing: male or female"),
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Get brand-specific size recommendations based on a measurement profile."""
    user = get_user_by_uid(x_firebase_uid, db)

    if gender not in ("male", "female"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gender must be 'male' or 'female'",
        )

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

    # Validate required measurements
    if not all([measurement.chest, measurement.waist, measurement.hip]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chest, waist, and hip measurements are required for size recommendations",
        )

    result = get_size_recommendations(
        chest=float(measurement.chest),
        waist=float(measurement.waist),
        hip=float(measurement.hip),
        gender=gender,
    )

    return {
        "measurement_name": measurement.name,
        **result,
    }
