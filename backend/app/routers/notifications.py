import random
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Notification, RecommendationItem, SavedOutfit, User
from app.utils.auth import get_current_user

router = APIRouter()


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str]
    link: Optional[str]
    metadata: Optional[dict] = None
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


def _to_response(n: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=n.id,
        type=n.type,
        title=n.title,
        body=n.body,
        link=n.link,
        metadata=n.notification_metadata,
        read_at=n.read_at,
        created_at=n.created_at,
    )


@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    unread_only: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    rows = q.order_by(Notification.created_at.desc()).limit(50).all()
    return [_to_response(n) for n in rows]


@router.get("/unread-count")
def unread_count(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .count()
    )
    return {"count": count}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user.id)
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    if n.read_at is None:
        n.read_at = datetime.utcnow()
        db.commit()
        db.refresh(n)
    return _to_response(n)


@router.post("/read-all")
def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .update({Notification.read_at: now})
    )
    db.commit()
    return {"updated": updated}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user.id)
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(n)
    db.commit()
    return None


class SimulateSaleRequest(BaseModel):
    item_id: Optional[str] = None
    drop_percent: int = Field(default=25, ge=5, le=80)


@router.post("/simulate-sale", response_model=NotificationResponse)
def simulate_sale(
    body: SimulateSaleRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Demo helper: pick (or use given) saved-outfit item, drop its price by
    drop_percent, and create a SALE notification linked back to saved outfits."""
    saved = (
        db.query(SavedOutfit)
        .filter(SavedOutfit.user_id == user.id)
        .all()
    )
    if not saved:
        raise HTTPException(status_code=400, detail="No saved outfits to simulate against")
    rec_ids = [s.recommendation_id for s in saved]

    item_query = db.query(RecommendationItem).filter(
        RecommendationItem.recommendation_id.in_(rec_ids),
        RecommendationItem.price.isnot(None),
    )
    if body.item_id:
        item = item_query.filter(RecommendationItem.id == body.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found in your saved outfits")
    else:
        items = item_query.all()
        if not items:
            raise HTTPException(status_code=400, detail="No priced items in saved outfits")
        item = random.choice(items)

    old_price = item.price or Decimal("0")
    if old_price <= 0:
        raise HTTPException(status_code=400, detail="Item has no price to drop")

    drop = Decimal(body.drop_percent) / Decimal(100)
    new_price = (old_price * (Decimal(1) - drop)).quantize(Decimal("0.01"))
    item.previous_price = old_price
    item.price = new_price
    item.price_changed_at = datetime.utcnow()

    saved_for_item = next((s for s in saved if s.recommendation_id == item.recommendation_id), None)
    notif = Notification(
        user_id=user.id,
        type="SALE",
        title=f"{body.drop_percent}% off: {item.name}",
        body=f"Price dropped from ${old_price} to ${new_price}",
        link="/saved-outfits",
        notification_metadata={
            "item_id": item.id,
            "recommendation_id": item.recommendation_id,
            "saved_outfit_id": saved_for_item.id if saved_for_item else None,
            "old_price": float(old_price),
            "new_price": float(new_price),
            "drop_percent": body.drop_percent,
        },
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return _to_response(notif)
