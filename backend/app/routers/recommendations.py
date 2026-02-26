from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.models.recommendations_ai import AIWebCandidatesRequest, AIWebCandidatesResponse
from app.services.recommendations_ai_service import RecommendationsAIService

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
    try:
        svc = get_svc()
        data = _merge_frontend_fields(data)
        return svc.generate_web_candidates(db=db, firebase_uid=x_firebase_uid or "", req=data)
    except ValueError as e:
        msg = str(e)
        if "Missing Firebase UID" in msg:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=msg)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
