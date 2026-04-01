from pydantic import BaseModel, Field, conint, confloat

from typing import Any, Dict, List, Literal, Optional


Category = Literal["TOP", "BOTTOM", "SHOES", "ACCESSORY", "OUTERWEAR", "OTHER"]


class ContextOverrides(BaseModel):
    occasion: Optional[str] = None
    weather: Optional[str] = None
    location: Optional[str] = None
    dress_code: Optional[str] = None

    extra: Dict[str, Any] = Field(default_factory=dict)


class AIWebCandidatesRequest(BaseModel):
    measurement_profile_id: Optional[str] = Field(
        default=None,
        description="If omitted, backend will use user's primary measurement profile.",
    )

    context_overrides: ContextOverrides = Field(default_factory=ContextOverrides)
    categories: List[Category] = Field(default_factory=list)

    k: conint(ge=1, le=20) = 8
    save_to_db: bool = True

    occasion: Optional[str] = None
    budget: Optional[confloat(gt=0)] = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    styles: List[str] = Field(default_factory=list)
    gender: Optional[str] = None
    location: Optional[str] = None
    weather: Optional[str] = None
    dress_code: Optional[str] = None


class CandidateItem(BaseModel):
    name: str
    category: Optional[Category] = None
    reasoning: str = ""

    query_terms: List[str] = Field(default_factory=list)
    source_urls: List[str] = Field(default_factory=list)

    brand: Optional[str] = None
    price: Optional[confloat(gt=0)] = None
    currency: Optional[str] = Field(default="USD", min_length=3, max_length=3)
    image_url: Optional[str] = None
    purchase_url: Optional[str] = None
    recommended_size: Optional[str] = None
    recommended_color: Optional[str] = None
    outfit_index: Optional[int] = None


class AIWebCandidatesResponse(BaseModel):
    recommendation_ids: List[str] = Field(default_factory=list)
    items: List[CandidateItem] = Field(default_factory=list)
    debug: Dict[str, Any] = Field(default_factory=dict)


class AlternativeItemsRequest(BaseModel):
    """Request alternative items for a specific category in an outfit context."""
    measurement_profile_id: Optional[str] = Field(
        default=None,
        description="If omitted, backend will use user's primary measurement profile.",
    )

    category: Category = Field(..., description="Category of item to find alternatives for")

    # Context from the original outfit
    occasion: Optional[str] = None
    weather: Optional[str] = None
    location: Optional[str] = None
    dress_code: Optional[str] = None

    # Constraints to match
    budget: Optional[confloat(gt=0)] = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    styles: List[str] = Field(default_factory=list)

    # Original item being replaced (for context)
    original_item_name: Optional[str] = None
    original_item_brand: Optional[str] = None

    # How many alternatives to return
    num_alternatives: conint(ge=1, le=10) = 5


class AlternativeItemsResponse(BaseModel):
    """Response containing alternative items."""
    items: List[CandidateItem] = Field(default_factory=list)
    debug: Dict[str, Any] = Field(default_factory=dict)