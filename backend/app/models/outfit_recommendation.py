from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class OutfitRecommendationCreate(BaseModel):
    """Create a new outfit recommendation."""
    measurement_id: Optional[str] = None
    occasion: str
    weather: str
    dress_code: str


class OutfitRecommendationUpdate(BaseModel):
    """Update an outfit recommendation."""
    occasion: Optional[str] = None
    weather: Optional[str] = None
    dress_code: Optional[str] = None
    total_price: Optional[float] = None
    reasoning: Optional[str] = None
    user_rating: Optional[str] = None


class OutfitRecommendationResponse(BaseModel):
    id: str
    user_id: str
    measurement_id: Optional[str] = None
    occasion: str
    weather: str
    dress_code: str
    total_price: Optional[float] = None
    reasoning: Optional[str] = None
    user_rating: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
