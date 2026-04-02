"""
Rating endpoints for outfit recommendations
Allows users to like/dislike recommendations for learning
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
import uuid

from app.db.database import get_db
from app.db.models import User, OutfitRecommendation, OutfitRating
from app.services.learning_service import RecommendationLearningService

router = APIRouter(prefix="/recommendations", tags=["ratings"])


# Request/Response Models
class RateOutfitRequest(BaseModel):
    rating: str  # "LIKE" or "DISLIKE"

    class Config:
        json_schema_extra = {
            "example": {
                "rating": "LIKE"
            }
        }


class RatingResponse(BaseModel):
    id: str
    recommendation_id: str
    rating: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class LearningStatsResponse(BaseModel):
    total_ratings: int
    likes: int
    dislikes: int
    learning_active: bool
    min_ratings_needed: int


# Dependency to get user_id from header
async def get_user_id(x_firebase_uid: str = Header(...)) -> str:
    return x_firebase_uid


@router.post("/{recommendation_id}/rate", response_model=RatingResponse)
async def rate_outfit(
    recommendation_id: str,
    request: RateOutfitRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Rate an outfit recommendation as LIKE or DISLIKE

    - **recommendation_id**: ID of the recommendation to rate
    - **rating**: "LIKE" or "DISLIKE"

    Returns the created/updated rating
    """
    # Validate rating value
    if request.rating not in ["LIKE", "DISLIKE"]:
        raise HTTPException(status_code=400, detail="Rating must be 'LIKE' or 'DISLIKE'")

    # Get user
    user = db.query(User).filter(User.firebase_uid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if recommendation exists and belongs to user
    recommendation = db.query(OutfitRecommendation).filter(
        OutfitRecommendation.id == recommendation_id,
        OutfitRecommendation.user_id == user.id
    ).first()

    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    # Check if rating already exists
    existing_rating = db.query(OutfitRating).filter(
        OutfitRating.user_id == user.id,
        OutfitRating.recommendation_id == recommendation_id
    ).first()

    if existing_rating:
        # Update existing rating
        existing_rating.rating = request.rating
        db.commit()
        db.refresh(existing_rating)

        return RatingResponse(
            id=existing_rating.id,
            recommendation_id=existing_rating.recommendation_id,
            rating=existing_rating.rating,
            created_at=existing_rating.created_at.isoformat(),
            updated_at=existing_rating.updated_at.isoformat()
        )
    else:
        # Create new rating
        new_rating = OutfitRating(
            id=str(uuid.uuid4()),
            user_id=user.id,
            recommendation_id=recommendation_id,
            rating=request.rating
        )

        db.add(new_rating)
        db.commit()
        db.refresh(new_rating)

        return RatingResponse(
            id=new_rating.id,
            recommendation_id=new_rating.recommendation_id,
            rating=new_rating.rating,
            created_at=new_rating.created_at.isoformat(),
            updated_at=new_rating.updated_at.isoformat()
        )


@router.get("/{recommendation_id}/rating", response_model=Optional[RatingResponse])
async def get_rating(
    recommendation_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Get user's rating for a specific recommendation

    Returns null if no rating exists
    """
    # Get user
    user = db.query(User).filter(User.firebase_uid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get rating
    rating = db.query(OutfitRating).filter(
        OutfitRating.user_id == user.id,
        OutfitRating.recommendation_id == recommendation_id
    ).first()

    if not rating:
        return None

    return RatingResponse(
        id=rating.id,
        recommendation_id=rating.recommendation_id,
        rating=rating.rating,
        created_at=rating.created_at.isoformat(),
        updated_at=rating.updated_at.isoformat()
    )


@router.delete("/{recommendation_id}/rating")
async def delete_rating(
    recommendation_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Delete user's rating for a recommendation
    """
    # Get user
    user = db.query(User).filter(User.firebase_uid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get rating
    rating = db.query(OutfitRating).filter(
        OutfitRating.user_id == user.id,
        OutfitRating.recommendation_id == recommendation_id
    ).first()

    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")

    db.delete(rating)
    db.commit()

    return {"message": "Rating deleted successfully"}


@router.get("/learning/stats", response_model=LearningStatsResponse)
async def get_learning_stats(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Get learning statistics for the current user

    Shows total ratings, likes, dislikes, and whether learning is active
    """
    # Get user
    user = db.query(User).filter(User.firebase_uid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get stats from learning service
    learning_service = RecommendationLearningService()
    stats = learning_service.get_learning_stats(db, user.id)

    return LearningStatsResponse(**stats)
