from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any, Tuple

from app.db.database import get_db
from app.db.models import (
    User,
    MeasurementProfile,
    StylePreference,
    ColorProfile,
    OutfitRecommendation,
    RecommendationItem,
)
from app.models.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
    OutfitRecommendationResponse,
    RecommendationItemResponse,
)
from app.services.recommendation_engine import generate_outfits
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


def _get_primary_measurement(user_id: str, db: Session) -> Optional[MeasurementProfile]:
    m = (
        db.query(MeasurementProfile)
        .filter(MeasurementProfile.user_id == user_id, MeasurementProfile.is_primary == True)  # noqa: E712
        .first()
    )
    if m:
        return m
    return (
        db.query(MeasurementProfile)
        .filter(MeasurementProfile.user_id == user_id)
        .order_by(MeasurementProfile.created_at.desc())
        .first()
    )


def _to_style_pref_dict(pref: Optional[StylePreference]) -> dict:
    if not pref:
        return {}
    return {
        "preferred_styles": pref.preferred_styles,
        "avoided_styles": pref.avoided_styles,
        "price_range": pref.price_range,
        "preferred_brands": pref.preferred_brands,
        "excluded_brands": pref.excluded_brands,
    }


def _to_color_profile_dict(cp: Optional[ColorProfile]) -> dict:
    if not cp:
        return {}
    return {
        "recommended_palette": cp.recommended_palette,
        "skin_tone": cp.skin_tone,
        "skin_tone_hex": cp.skin_tone_hex,
        "hair_color": cp.hair_color,
        "hair_color_hex": cp.hair_color_hex,
    }


def _to_measurement_dict(m: Optional[MeasurementProfile]) -> dict:
    if not m:
        return {}
    # Numeric -> float
    def f(x):
        return float(x) if x is not None else None

    return {
        "height": f(m.height),
        "weight": f(m.weight),
        "chest": f(m.chest),
        "waist": f(m.waist),
        "hip": f(m.hip),
        "inseam": f(m.inseam),
        "shoulder_width": f(m.shoulder_width),
        "arm_length": f(m.arm_length),
    }


def _build_brand_size_map(size_result: Dict[str, Any]) -> Tuple[Dict[str, str], Optional[str]]:
    """
    Build a case-insensitive map: brand -> recommended_size
    Also return a fallback size (best fit_score across all brands).
    """
    brand_to_size: Dict[str, str] = {}
    fallback_size: Optional[str] = None
    best_score = -1

    recs = (size_result or {}).get("recommendations") or []
    for r in recs:
        brand = (r.get("brand") or "").strip()
        rec_size = (r.get("recommended_size") or "").strip()
        score = r.get("fit_score", -1)

        if brand and rec_size:
            brand_to_size[brand.lower()] = rec_size

        # fallback: use the best fit_score size
        try:
            s = int(score)
        except Exception:
            s = -1
        if rec_size and s > best_score:
            best_score = s
            fallback_size = rec_size

    return brand_to_size, fallback_size


def _recommended_size_for_item(
    item_brand: Optional[str],
    brand_to_size: Dict[str, str],
    fallback_size: Optional[str],
) -> Optional[str]:
    """Pick recommended size by brand; fallback if brand not found."""
    if item_brand:
        key = item_brand.strip().lower()
        if key in brand_to_size:
            return brand_to_size[key]
    return fallback_size


@router.post(
    "/api/recommendations",
    response_model=RecommendationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_recommendations(
    data: RecommendationRequest,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    user = get_user_by_uid(x_firebase_uid, db)

    style_pref = db.query(StylePreference).filter(StylePreference.user_id == user.id).first()
    color_profile = db.query(ColorProfile).filter(ColorProfile.user_id == user.id).first()
    primary_measurement = _get_primary_measurement(user.id, db)

    # Generate outfits from C2 catalog
    outfits = generate_outfits(
        occasion=data.occasion,
        limit=data.limit,
        weather=data.weather,
        dress_code=data.dress_code,
        style_preference=_to_style_pref_dict(style_pref),
        color_profile=_to_color_profile_dict(color_profile),
        measurement_profile=_to_measurement_dict(primary_measurement),
    )

    if not outfits:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough catalog items to assemble complete outfits for this request.",
        )

    gender = "male"
    brand_to_size: Dict[str, str] = {}
    fallback_size: Optional[str] = None

    if primary_measurement and primary_measurement.chest and primary_measurement.waist and primary_measurement.hip:
        size_result = get_size_recommendations(
            chest=float(primary_measurement.chest),
            waist=float(primary_measurement.waist),
            hip=float(primary_measurement.hip),
            gender=gender,
        )
        brand_to_size, fallback_size = _build_brand_size_map(size_result)

    persisted: List[OutfitRecommendation] = []

    try:
        for outfit in outfits:
            rec = OutfitRecommendation(
                user_id=user.id,
                occasion=outfit.occasion,
                weather=outfit.weather,
                dress_code=outfit.dress_code,
                total_price=outfit.total_price,
                reasoning=outfit.reasoning,
                user_rating="NONE",
            )
            db.add(rec)
            db.flush()

            for it in outfit.items:
                rec_size = _recommended_size_for_item(it.brand, brand_to_size, fallback_size)

                item = RecommendationItem(
                    recommendation_id=rec.id,
                    external_product_id=it.external_product_id,
                    name=it.name,
                    brand=it.brand,
                    category=it.category,
                    price=it.price,
                    currency=it.currency or "USD",
                    image_url=it.image_url,
                    purchase_url=it.purchase_url,
                    recommended_size=rec_size,
                    colors=it.colors,
                    material=it.material,
                )
                db.add(item)

            persisted.append(rec)

        db.commit()
        for rec in persisted:
            db.refresh(rec)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create recommendations: {str(e)}",
        )

    # Build response
    resp_recs: List[OutfitRecommendationResponse] = []
    for rec in persisted:
        items_resp: List[RecommendationItemResponse] = []
        for item in rec.items:
            items_resp.append(
                RecommendationItemResponse(
                    id=item.id,
                    recommendation_id=item.recommendation_id,
                    external_product_id=item.external_product_id,
                    name=item.name,
                    brand=item.brand,
                    category=item.category,
                    price=float(item.price) if item.price is not None else None,
                    currency=item.currency,
                    image_url=item.image_url,
                    purchase_url=item.purchase_url,
                    recommended_size=item.recommended_size,
                    colors=item.colors,
                    material=item.material,
                )
            )

        resp_recs.append(
            OutfitRecommendationResponse(
                id=rec.id,
                user_id=rec.user_id,
                occasion=rec.occasion,
                weather=rec.weather,
                dress_code=rec.dress_code,
                total_price=float(rec.total_price) if rec.total_price is not None else None,
                reasoning=rec.reasoning,
                user_rating=rec.user_rating,
                created_at=rec.created_at,
                items=items_resp,
            )
        )

    return RecommendationResponse(recommendations=resp_recs)