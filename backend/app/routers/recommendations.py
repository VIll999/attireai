from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import asyncio
from functools import partial

from app.db.database import get_db
from app.db.models import RecommendationItem, User
from app.models.recommendations_ai import (
    AIWebCandidatesRequest,
    AIWebCandidatesResponse,
    AlternativeItemsRequest,
    AlternativeItemsResponse,
)
from app.services.price_comparison_service import PriceComparisonService
from app.services.recommendations_ai_service import RecommendationsAIService
from app.utils.auth import check_daily_recommendation_limit, consume_daily_recommendation

router = APIRouter()

# Lazy singleton — don't instantiate at import time (would crash if no API key)
_svc: Optional[RecommendationsAIService] = None


def get_svc() -> RecommendationsAIService:
    global _svc
    if _svc is None:
        _svc = RecommendationsAIService()
    return _svc


def _merge_frontend_fields(data: AIWebCandidatesRequest) -> AIWebCandidatesRequest:
    overrides = data.context_overrides
    if not overrides.occasion and data.occasion:
        overrides.occasion = data.occasion
    if not overrides.location and data.location:
        overrides.location = data.location
    if not overrides.weather and data.weather:
        overrides.weather = data.weather
    if not overrides.dress_code and data.dress_code:
        overrides.dress_code = data.dress_code

    extra = overrides.extra or {}
    if data.budget is not None and "budget" not in extra:
        extra["budget"] = float(data.budget)
    if data.currency and "currency" not in extra:
        extra["currency"] = data.currency
    if data.gender and "gender" not in extra:
        extra["gender"] = data.gender
    if data.styles and "styles" not in extra:
        extra["styles"] = list(data.styles)

    overrides.extra = extra
    data.context_overrides = overrides
    return data


@router.post("/recommendations/ai-products", response_model=AIWebCandidatesResponse)
async def ai_products(
    data: AIWebCandidatesRequest,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    if not x_firebase_uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Firebase UID")
    user = db.query(User).filter(User.firebase_uid == x_firebase_uid).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    check_daily_recommendation_limit(user, db)

    try:
        svc = get_svc()
        data = _merge_frontend_fields(data)

        # Run the blocking AI generation in a thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,  # Use default executor
            partial(svc.generate_web_candidates, db=db, firebase_uid=x_firebase_uid or "", req=data)
        )
        consume_daily_recommendation(user, db)
        return result
    except ValueError as e:
        msg = str(e)
        if "Missing Firebase UID" in msg:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=msg)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommendations/alternatives", response_model=AlternativeItemsResponse)
async def get_alternative_items(
    data: AlternativeItemsRequest,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Get alternative items for a specific category within an outfit context.

    This endpoint generates alternative product suggestions that match the
    same constraints as the original outfit (occasion, weather, style preferences, etc.)
    """
    try:
        svc = get_svc()

        # Run the blocking AI generation in a thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            partial(svc.generate_alternative_items, db=db, firebase_uid=x_firebase_uid or "", req=data)
        )
        return result
    except ValueError as e:
        msg = str(e)
        if "Missing Firebase UID" in msg:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=msg)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class PriceComparisonResult(BaseModel):
    retailer: str
    price: Optional[float] = None
    currency: Optional[str] = "USD"
    url: str
    stock_status: Optional[str] = "UNKNOWN"
    image_url: Optional[str] = None
    notes: Optional[str] = None


class PriceComparisonResponse(BaseModel):
    item_id: str
    item_name: str
    item_brand: Optional[str] = None
    current_price: Optional[float] = None
    results: List[PriceComparisonResult] = []


@router.get("/recommendations/items/{item_id}/compare-prices", response_model=PriceComparisonResponse)
async def compare_prices(
    item_id: str,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Story #8: search the web for similar listings of this item and return them
    grouped by retailer. Empty results list if nothing found."""
    if not x_firebase_uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Firebase UID")
    item = db.query(RecommendationItem).filter(RecommendationItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            partial(
                PriceComparisonService.compare,
                name=item.name,
                brand=item.brand,
                currency=item.currency or "USD",
            ),
        )
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return PriceComparisonResponse(
        item_id=item.id,
        item_name=item.name,
        item_brand=item.brand,
        current_price=float(item.price) if item.price is not None else None,
        results=[PriceComparisonResult(**r) for r in results],
    )
