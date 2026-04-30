from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    Notification,
    OutfitRecommendation,
    RecommendationItem,
    SavedOutfit,
    Subscription,
    User,
    VirtualTryOn,
)
from app.utils.auth import require_admin

router = APIRouter()


# --- Stats ---


class AdminStatsResponse(BaseModel):
    total_users: int
    users_free: int
    users_vip: int
    new_users_7d: int

    total_recommendations: int
    recommendations_7d: int
    total_saved_outfits: int

    total_try_ons: int
    try_ons_completed: int
    try_ons_failed: int

    total_notifications: int
    unread_notifications: int

    subs_active: int
    subs_trialing: int
    subs_cancelled: int


@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    total_users = db.query(func.count(User.id)).scalar() or 0
    users_free = (
        db.query(func.count(User.id)).filter(User.subscription_tier == "FREE").scalar() or 0
    )
    users_vip = (
        db.query(func.count(User.id)).filter(User.subscription_tier == "VIP").scalar() or 0
    )
    new_users_7d = (
        db.query(func.count(User.id)).filter(User.created_at >= seven_days_ago).scalar() or 0
    )

    total_recommendations = db.query(func.count(OutfitRecommendation.id)).scalar() or 0
    recommendations_7d = (
        db.query(func.count(OutfitRecommendation.id))
        .filter(OutfitRecommendation.created_at >= seven_days_ago)
        .scalar() or 0
    )
    total_saved_outfits = db.query(func.count(SavedOutfit.id)).scalar() or 0

    total_try_ons = db.query(func.count(VirtualTryOn.id)).scalar() or 0
    try_ons_completed = (
        db.query(func.count(VirtualTryOn.id)).filter(VirtualTryOn.status == "COMPLETED").scalar() or 0
    )
    try_ons_failed = (
        db.query(func.count(VirtualTryOn.id)).filter(VirtualTryOn.status == "FAILED").scalar() or 0
    )

    total_notifications = db.query(func.count(Notification.id)).scalar() or 0
    unread_notifications = (
        db.query(func.count(Notification.id)).filter(Notification.read_at.is_(None)).scalar() or 0
    )

    subs_active = (
        db.query(func.count(Subscription.id)).filter(Subscription.status == "ACTIVE").scalar() or 0
    )
    subs_trialing = (
        db.query(func.count(Subscription.id)).filter(Subscription.status == "TRIALING").scalar() or 0
    )
    subs_cancelled = (
        db.query(func.count(Subscription.id)).filter(Subscription.status == "CANCELLED").scalar() or 0
    )

    return AdminStatsResponse(
        total_users=total_users,
        users_free=users_free,
        users_vip=users_vip,
        new_users_7d=new_users_7d,
        total_recommendations=total_recommendations,
        recommendations_7d=recommendations_7d,
        total_saved_outfits=total_saved_outfits,
        total_try_ons=total_try_ons,
        try_ons_completed=try_ons_completed,
        try_ons_failed=try_ons_failed,
        total_notifications=total_notifications,
        unread_notifications=unread_notifications,
        subs_active=subs_active,
        subs_trialing=subs_trialing,
        subs_cancelled=subs_cancelled,
    )


# --- Product catalog management ---


class ProductRow(BaseModel):
    id: str
    name: str
    brand: Optional[str]
    category: Optional[str]
    price: Optional[float]
    previous_price: Optional[float]
    currency: Optional[str]
    image_url: Optional[str]
    purchase_url: Optional[str]
    stock_status: Optional[str]
    recommendation_id: str

    class Config:
        from_attributes = True


def _to_row(item: RecommendationItem) -> ProductRow:
    return ProductRow(
        id=item.id,
        name=item.name,
        brand=item.brand,
        category=item.category,
        price=float(item.price) if item.price is not None else None,
        previous_price=float(item.previous_price) if item.previous_price is not None else None,
        currency=item.currency,
        image_url=item.image_url,
        purchase_url=item.purchase_url,
        stock_status=item.stock_status,
        recommendation_id=item.recommendation_id,
    )


class ProductsListResponse(BaseModel):
    items: List[ProductRow]
    total: int
    page: int
    per_page: int


@router.get("/products", response_model=ProductsListResponse)
def list_products(
    q: Optional[str] = Query(None, description="Search name/brand"),
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(RecommendationItem)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (RecommendationItem.name.ilike(like)) | (RecommendationItem.brand.ilike(like))
        )
    if category:
        query = query.filter(RecommendationItem.category == category)

    total = query.count()
    rows = (
        query.order_by(RecommendationItem.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return ProductsListResponse(
        items=[_to_row(r) for r in rows],
        total=total,
        page=page,
        per_page=per_page,
    )


class ProductUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    brand: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    stock_status: Optional[str] = None
    purchase_url: Optional[str] = None


@router.patch("/products/{product_id}", response_model=ProductRow)
def update_product(
    product_id: str,
    body: ProductUpdateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(RecommendationItem).filter(RecommendationItem.id == product_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Product not found")

    if body.name is not None:
        item.name = body.name
    if body.brand is not None:
        item.brand = body.brand
    if body.category is not None:
        if body.category not in {"TOP", "BOTTOM", "SHOES", "ACCESSORY", "OUTERWEAR"}:
            raise HTTPException(status_code=400, detail="Invalid category")
        item.category = body.category
    if body.price is not None and (item.price is None or float(item.price) != body.price):
        item.previous_price = item.price
        item.price = body.price
        item.price_changed_at = datetime.utcnow()
    if body.stock_status is not None:
        if body.stock_status not in {"IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "UNKNOWN"}:
            raise HTTPException(status_code=400, detail="Invalid stock_status")
        item.stock_status = body.stock_status
    if body.purchase_url is not None:
        item.purchase_url = body.purchase_url

    db.commit()
    db.refresh(item)
    return _to_row(item)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(RecommendationItem).filter(RecommendationItem.id == product_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(item)
    db.commit()
    return None
