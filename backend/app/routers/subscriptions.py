from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.database import get_db
from app.db.models import Subscription, User
from app.models.subscription import (
    CheckoutRequest,
    CheckoutResponse,
    StripeConfigResponse,
    SubscriptionStatusResponse,
)
from app.services import stripe_service
from app.utils.auth import get_current_user, is_admin_email

router = APIRouter()
settings = get_settings()


@router.get("/config", response_model=StripeConfigResponse)
async def get_config():
    return StripeConfigResponse(
        publishable_key=settings.stripe_publishable_key,
        monthly_price_usd=settings.vip_monthly_price_usd,
    )


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    cancel_at_period_end = False
    if sub and sub.stripe_subscription_id:
        try:
            stripe_sub = stripe_service.get_subscription(sub.stripe_subscription_id)
            cancel_at_period_end = bool(stripe_sub.get("cancel_at_period_end", False))
        except Exception:
            pass
    return SubscriptionStatusResponse(
        tier=user.subscription_tier,
        status=sub.status if sub else None,
        current_period_end=sub.current_period_end if sub else None,
        cancel_at_period_end=cancel_at_period_end,
        vip_trial_used=user.vip_trial_used,
        is_admin=is_admin_email(user.email),
        monthly_price_usd=settings.vip_monthly_price_usd,
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.subscription_tier == "VIP":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already a VIP subscriber",
        )
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    customer_id = stripe_service.get_or_create_customer(
        user_id=user.id,
        email=user.email,
        name=user.name,
        stripe_customer_id=sub.stripe_customer_id if sub else None,
    )
    if not sub:
        sub = Subscription(user_id=user.id, stripe_customer_id=customer_id, status="TRIALING")
        db.add(sub)
    else:
        sub.stripe_customer_id = customer_id
    db.commit()
    try:
        session = stripe_service.create_checkout_session(
            customer_id=customer_id,
            success_url=body.success_url,
            cancel_url=body.cancel_url,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc}",
        )
    return CheckoutResponse(checkout_url=session.url)


@router.post("/cancel", response_model=SubscriptionStatusResponse)
async def cancel(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if not sub or not sub.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription",
        )
    try:
        stripe_service.cancel_subscription(sub.stripe_subscription_id, at_period_end=True)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc}",
        )
    return SubscriptionStatusResponse(
        tier=user.subscription_tier,
        status=sub.status,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=True,
        vip_trial_used=user.vip_trial_used,
        is_admin=is_admin_email(user.email),
        monthly_price_usd=settings.vip_monthly_price_usd,
    )


@router.post("/reactivate", response_model=SubscriptionStatusResponse)
async def reactivate(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if not sub or not sub.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No subscription to reactivate",
        )
    try:
        stripe_service.reactivate_subscription(sub.stripe_subscription_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc}",
        )
    return SubscriptionStatusResponse(
        tier=user.subscription_tier,
        status=sub.status,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=False,
        vip_trial_used=user.vip_trial_used,
        is_admin=is_admin_email(user.email),
        monthly_price_usd=settings.vip_monthly_price_usd,
    )
