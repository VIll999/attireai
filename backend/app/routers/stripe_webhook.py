from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Subscription, User
from app.services import stripe_service

router = APIRouter()


_STATUS_MAP = {
    "trialing": "TRIALING",
    "active": "ACTIVE",
    "past_due": "PAST_DUE",
    "canceled": "CANCELLED",
    "unpaid": "PAST_DUE",
    "incomplete": "TRIALING",
    "incomplete_expired": "CANCELLED",
}


def _ts_to_dt(ts) -> datetime | None:
    if ts is None:
        return None
    try:
        return datetime.utcfromtimestamp(int(ts))
    except (TypeError, ValueError):
        return None


def _get_user_for_customer(db: Session, customer_id: str) -> User | None:
    sub = db.query(Subscription).filter(Subscription.stripe_customer_id == customer_id).first()
    if not sub:
        return None
    return db.query(User).filter(User.id == sub.user_id).first()


def _apply_subscription(db: Session, customer_id: str, stripe_sub: dict) -> None:
    user = _get_user_for_customer(db, customer_id)
    if not user:
        return
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if not sub:
        sub = Subscription(user_id=user.id, stripe_customer_id=customer_id)
        db.add(sub)
    sub.stripe_subscription_id = stripe_sub.get("id")
    raw_status = stripe_sub.get("status", "incomplete")
    sub.status = _STATUS_MAP.get(raw_status, "CANCELLED")
    sub.current_period_start = _ts_to_dt(stripe_sub.get("current_period_start"))
    sub.current_period_end = _ts_to_dt(stripe_sub.get("current_period_end"))
    if sub.status in ("ACTIVE", "TRIALING"):
        user.subscription_tier = "VIP"
    else:
        user.subscription_tier = "FREE"
    db.commit()


def _handle_subscription_deleted(db: Session, customer_id: str, stripe_sub: dict) -> None:
    user = _get_user_for_customer(db, customer_id)
    if not user:
        return
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if sub:
        sub.status = "CANCELLED"
        sub.current_period_end = _ts_to_dt(stripe_sub.get("current_period_end"))
    user.subscription_tier = "FREE"
    db.commit()


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe_service.construct_webhook_event(payload, sig_header)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid payload: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid signature: {exc}")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        customer_id = data.get("customer")
        sub_id = data.get("subscription")
        if customer_id and sub_id:
            stripe_sub = stripe_service.get_subscription(sub_id)
            _apply_subscription(db, customer_id, dict(stripe_sub))

    elif event_type in ("customer.subscription.created", "customer.subscription.updated"):
        customer_id = data.get("customer")
        if customer_id:
            _apply_subscription(db, customer_id, data)

    elif event_type == "customer.subscription.deleted":
        customer_id = data.get("customer")
        if customer_id:
            _handle_subscription_deleted(db, customer_id, data)

    elif event_type == "invoice.payment_failed":
        customer_id = data.get("customer")
        if customer_id:
            user = _get_user_for_customer(db, customer_id)
            if user:
                sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
                if sub:
                    sub.status = "PAST_DUE"
                    db.commit()

    return {"received": True}
