from pydantic import BaseModel, Field

from typing import Optional, List, Any
from datetime import datetime


class RecommendationRequest(BaseModel):
    """Frontend -> Backend request for outfit recommendations."""
    occasion: str = Field(..., min_length=1)
    limit: int = Field(default=3, ge=1, le=10)
    weather: Optional[str] = None
    dress_code: Optional[str] = None


class RecommendationItemResponse(BaseModel):
    """One item inside a recommendation (matches recommendation_items table)."""
    id: str
    recommendation_id: str

    external_product_id: Optional[str] = None
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None  # TOP/BOTTOM/SHOES/ACCESSORY/OUTERWEAR
    price: Optional[float] = None
    currency: str = "USD"
    image_url: Optional[str] = None
    purchase_url: Optional[str] = None
    recommended_size: Optional[str] = None
    colors: Optional[Any] = None  # JSON
    material: Optional[str] = None

    class Config:
        from_attributes = True


class OutfitRecommendationResponse(BaseModel):
    """One outfit recommendation (matches outfit_recommendations table)."""
    id: str
    user_id: str
    occasion: Optional[str] = None
    weather: Optional[str] = None
    dress_code: Optional[str] = None
    total_price: Optional[float] = None
    reasoning: Optional[str] = None
    user_rating: str = "NONE"
    created_at: datetime

    items: List[RecommendationItemResponse] = []

    class Config:
        from_attributes = True


class RecommendationResponse(BaseModel):
    """API response wrapper."""
    recommendations: List[OutfitRecommendationResponse]