from collections import defaultdict
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import RecommendationItem, SavedOutfit, User
from app.utils.auth import get_current_user

router = APIRouter()


class WardrobeItem(BaseModel):
    id: str
    name: str
    brand: Optional[str]
    category: Optional[str]
    price: Optional[float]
    currency: Optional[str]
    image_url: Optional[str]
    purchase_url: Optional[str]
    saved_outfit_id: str
    purchased_at: Optional[str] = None


class WardrobeResponse(BaseModel):
    items: List[WardrobeItem]
    by_category: Dict[str, List[WardrobeItem]]
    total: int


@router.get("", response_model=WardrobeResponse)
def get_wardrobe(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Items the user owns, derived from saved outfits marked as purchased."""
    purchased = (
        db.query(SavedOutfit)
        .filter(SavedOutfit.user_id == user.id, SavedOutfit.is_purchased.is_(True))
        .all()
    )
    rec_to_saved = {s.recommendation_id: s for s in purchased}
    if not rec_to_saved:
        return WardrobeResponse(items=[], by_category={}, total=0)

    items_db = (
        db.query(RecommendationItem)
        .filter(RecommendationItem.recommendation_id.in_(list(rec_to_saved.keys())))
        .all()
    )

    items: List[WardrobeItem] = []
    seen_ids: set[str] = set()
    for item in items_db:
        if item.id in seen_ids:
            continue
        seen_ids.add(item.id)
        saved = rec_to_saved.get(item.recommendation_id)
        items.append(
            WardrobeItem(
                id=item.id,
                name=item.name,
                brand=item.brand,
                category=item.category,
                price=float(item.price) if item.price is not None else None,
                currency=item.currency,
                image_url=item.image_url,
                purchase_url=item.purchase_url,
                saved_outfit_id=saved.id if saved else "",
                purchased_at=saved.created_at.isoformat() if saved and saved.created_at else None,
            )
        )

    by_category: Dict[str, List[WardrobeItem]] = defaultdict(list)
    for it in items:
        key = it.category or "OTHER"
        by_category[key].append(it)

    return WardrobeResponse(
        items=items,
        by_category=dict(by_category),
        total=len(items),
    )


@router.get("/items/{item_id}", response_model=WardrobeItem)
def get_wardrobe_item(
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(RecommendationItem).filter(RecommendationItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    # Confirm ownership: must be in a purchased saved outfit of this user
    saved = (
        db.query(SavedOutfit)
        .filter(
            SavedOutfit.user_id == user.id,
            SavedOutfit.recommendation_id == item.recommendation_id,
            SavedOutfit.is_purchased.is_(True),
        )
        .first()
    )
    if not saved:
        raise HTTPException(status_code=403, detail="Item not in your wardrobe")
    return WardrobeItem(
        id=item.id,
        name=item.name,
        brand=item.brand,
        category=item.category,
        price=float(item.price) if item.price is not None else None,
        currency=item.currency,
        image_url=item.image_url,
        purchase_url=item.purchase_url,
        saved_outfit_id=saved.id,
        purchased_at=saved.created_at.isoformat() if saved.created_at else None,
    )
