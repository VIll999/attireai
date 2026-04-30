import io
import logging
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.database import get_db
from app.db.models import OutfitRecommendation, RecommendationItem, User, VirtualTryOn
from app.models.virtual_try_on import TryOnGenerateRequest, TryOnResponse
from app.services import try_on_service
from app.services.s3 import get_s3_client
from app.utils.auth import consume_vip_trial_if_free, get_current_user, require_vip

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_BYTES = 8 * 1024 * 1024


@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")
    content = await file.read()
    if len(content) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=400, detail="Photo too large (max 8MB)")
    s3 = get_s3_client()
    ext = (file.filename or "photo.jpg").rsplit(".", 1)[-1].lower() or "jpg"
    if ext not in {"jpg", "jpeg", "png", "webp"}:
        ext = "jpg"
    key = f"virtual-try-on/{user.firebase_uid}/photos/{uuid.uuid4()}.{ext}"
    try:
        s3.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=content,
            ContentType=file.content_type or "image/jpeg",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}")
    return {"url": f"https://{settings.cdn_domain}/{key}"}


def _save_result(image_bytes: bytes, firebase_uid: str) -> str:
    s3 = get_s3_client()
    key = f"virtual-try-on/{firebase_uid}/results/{uuid.uuid4()}.png"
    s3.put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=image_bytes,
        ContentType="image/png",
    )
    return f"https://{settings.cdn_domain}/{key}"


def _outfit_description(outfit: OutfitRecommendation, items: List[RecommendationItem]) -> str:
    parts = []
    for item in items:
        bits = [item.name]
        if item.brand:
            bits.append(f"by {item.brand}")
        if item.category:
            bits.append(f"({item.category.lower()})")
        parts.append(" ".join(bits))
    desc = "; ".join(parts) if parts else "stylish outfit"
    if outfit.occasion:
        desc = f"{desc}. Occasion: {outfit.occasion}."
    return desc


@router.post("/generate", response_model=TryOnResponse)
async def generate(
    body: TryOnGenerateRequest,
    user: User = Depends(require_vip),
    db: Session = Depends(get_db),
):
    outfit = (
        db.query(OutfitRecommendation)
        .filter(OutfitRecommendation.id == body.outfit_id, OutfitRecommendation.user_id == user.id)
        .first()
    )
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")
    items = (
        db.query(RecommendationItem)
        .filter(RecommendationItem.recommendation_id == outfit.id)
        .all()
    )

    record = VirtualTryOn(
        user_id=user.id,
        outfit_id=outfit.id,
        user_photo_url=body.user_photo_url,
        status="PROCESSING",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    try:
        item_urls = [item.image_url for item in items if item.image_url]
        image_bytes = try_on_service.TryOnService.generate(
            user_photo_url=body.user_photo_url,
            item_image_urls=item_urls,
            outfit_description=_outfit_description(outfit, items),
        )
        result_url = _save_result(image_bytes, user.firebase_uid)
    except Exception as exc:
        record.status = "FAILED"
        db.commit()
        logger.error("Try-on failed for user %s outfit %s: %s", user.id, outfit.id, exc)
        raise HTTPException(status_code=502, detail=f"Try-on generation failed: {exc}")

    record.result_image_url = result_url
    record.status = "COMPLETED"
    record.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(record)

    consume_vip_trial_if_free(user, db)

    return record


@router.get("", response_model=List[TryOnResponse])
async def list_try_ons(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(VirtualTryOn)
        .filter(VirtualTryOn.user_id == user.id)
        .order_by(VirtualTryOn.created_at.desc())
        .all()
    )


@router.get("/{try_on_id}", response_model=TryOnResponse)
async def get_try_on(
    try_on_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(VirtualTryOn)
        .filter(VirtualTryOn.id == try_on_id, VirtualTryOn.user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Try-on not found")
    return record


@router.delete("/{try_on_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_try_on(
    try_on_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(VirtualTryOn)
        .filter(VirtualTryOn.id == try_on_id, VirtualTryOn.user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Try-on not found")
    db.delete(record)
    db.commit()
    return None
