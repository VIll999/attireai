from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional, List
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import OutfitRecommendation, User
from app.models.outfit_recommendation import (
    OutfitRecommendationCreate,
    OutfitRecommendationUpdate,
    OutfitRecommendationResponse,
)

router = APIRouter()


@router.post("", response_model=OutfitRecommendationResponse)
async def create_outfit_recommendation(
    recommendation: OutfitRecommendationCreate,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Create a new outfit recommendation."""
    if not x_firebase_uid:
        raise HTTPException(status_code=401, detail="Missing Firebase UID header")

    # Get user from Firebase UID
    user = db.query(User).filter(User.firebase_uid == x_firebase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Create recommendation
    new_recommendation = OutfitRecommendation(
        user_id=user.id,
        measurement_id=recommendation.measurement_id,
        occasion=recommendation.occasion,
        weather=recommendation.weather,
        dress_code=recommendation.dress_code,
    )

    db.add(new_recommendation)
    db.commit()
    db.refresh(new_recommendation)

    return new_recommendation


@router.get("", response_model=List[OutfitRecommendationResponse])
async def get_outfit_recommendations(
    measurement_id: Optional[str] = None,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Get all outfit recommendations for the current user."""
    if not x_firebase_uid:
        raise HTTPException(status_code=401, detail="Missing Firebase UID header")

    # Get user from Firebase UID
    user = db.query(User).filter(User.firebase_uid == x_firebase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Query recommendations
    query = db.query(OutfitRecommendation).filter(
        OutfitRecommendation.user_id == user.id
    )

    if measurement_id:
        query = query.filter(OutfitRecommendation.measurement_id == measurement_id)

    recommendations = query.order_by(OutfitRecommendation.created_at.desc()).all()

    return recommendations


@router.get("/{recommendation_id}", response_model=OutfitRecommendationResponse)
async def get_outfit_recommendation(
    recommendation_id: str,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Get a specific outfit recommendation."""
    if not x_firebase_uid:
        raise HTTPException(status_code=401, detail="Missing Firebase UID header")

    # Get user from Firebase UID
    user = db.query(User).filter(User.firebase_uid == x_firebase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get recommendation
    recommendation = (
        db.query(OutfitRecommendation)
        .filter(
            OutfitRecommendation.id == recommendation_id,
            OutfitRecommendation.user_id == user.id,
        )
        .first()
    )

    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    return recommendation


@router.put("/{recommendation_id}", response_model=OutfitRecommendationResponse)
async def update_outfit_recommendation(
    recommendation_id: str,
    update_data: OutfitRecommendationUpdate,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Update an outfit recommendation."""
    if not x_firebase_uid:
        raise HTTPException(status_code=401, detail="Missing Firebase UID header")

    # Get user from Firebase UID
    user = db.query(User).filter(User.firebase_uid == x_firebase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get recommendation
    recommendation = (
        db.query(OutfitRecommendation)
        .filter(
            OutfitRecommendation.id == recommendation_id,
            OutfitRecommendation.user_id == user.id,
        )
        .first()
    )

    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(recommendation, key, value)

    db.commit()
    db.refresh(recommendation)

    return recommendation


@router.delete("/{recommendation_id}")
async def delete_outfit_recommendation(
    recommendation_id: str,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Delete an outfit recommendation."""
    if not x_firebase_uid:
        raise HTTPException(status_code=401, detail="Missing Firebase UID header")

    # Get user from Firebase UID
    user = db.query(User).filter(User.firebase_uid == x_firebase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get recommendation
    recommendation = (
        db.query(OutfitRecommendation)
        .filter(
            OutfitRecommendation.id == recommendation_id,
            OutfitRecommendation.user_id == user.id,
        )
        .first()
    )

    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    db.delete(recommendation)
    db.commit()

    return {"message": "Recommendation deleted successfully"}
