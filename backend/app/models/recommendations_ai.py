from pydantic import BaseModel, Field, HttpUrl, conint, confloat

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


class CandidateItem(BaseModel):
    name: str
    category: Optional[Category] = None
    reasoning: str

    query_terms: List[str] = Field(default_factory=list)
    source_urls: List[HttpUrl] = Field(default_factory=list)

    brand: Optional[str] = None
    price: Optional[confloat(gt=0)] = None
    currency: Optional[str] = Field(default="USD", min_length=3, max_length=3)
    image_url: Optional[HttpUrl] = None
    purchase_url: Optional[HttpUrl] = None
    recommended_size: Optional[str] = None
    recommended_color: Optional[str] = None


class AIWebCandidatesResponse(BaseModel):
    recommendation_id: Optional[str] = None
    items: List[CandidateItem] = Field(default_factory=list)
    debug: Dict[str, Any] = Field(default_factory=dict)