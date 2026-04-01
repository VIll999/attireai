from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class OutfitRecommendationCreate(BaseModel):
    """Create a new outfit recommendation."""
    measurement_id: Optional[str] = None
    occasion: Optional[str] = None
    weather: Optional[str] = None
    dress_code: Optional[str] = None


class OutfitRecommendationUpdate(BaseModel):
    """Update an outfit recommendation."""
    occasion: Optional[str] = None
    weather: Optional[str] = None
    dress_code: Optional[str] = None
    total_price: Optional[float] = None
    reasoning: Optional[str] = None
    user_rating: Optional[str] = None


class RecommendationItemResponse(BaseModel):
    id: str
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = "USD"
    image_url: Optional[str] = None
    purchase_url: Optional[str] = None
    recommended_size: Optional[str] = None
    outfit_index: Optional[int] = None
    stock_status: Optional[str] = "UNKNOWN"

    class Config:
        from_attributes = True


class OutfitRecommendationResponse(BaseModel):
    id: str
    user_id: str
    measurement_id: Optional[str] = None
    occasion: Optional[str] = None
    weather: Optional[str] = None
    dress_code: Optional[str] = None
    total_price: Optional[float] = None
    reasoning: Optional[str] = None
    user_rating: Optional[str] = None
    created_at: datetime
    items: List[RecommendationItemResponse] = []

    class Config:
        from_attributes = True
