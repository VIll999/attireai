from datetime import date
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import Optional

from app.config import get_settings
from app.db.database import get_db
from app.db.models import User


def get_current_user(
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not x_firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Firebase UID header",
        )
    user = db.query(User).filter(User.firebase_uid == x_firebase_uid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def is_admin_email(email: str) -> bool:
    return email.lower() in get_settings().admin_email_list


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not is_admin_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


def require_vip(user: User = Depends(get_current_user)) -> User:
    """VIP-only feature. Free users with unused trial may proceed once;
    callers are responsible for marking the trial used after success."""
    if user.subscription_tier == "VIP":
        return user
    settings = get_settings()
    if not user.vip_trial_used and settings.vip_free_trial_uses > 0:
        return user
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail="VIP subscription required",
    )


def consume_vip_trial_if_free(user: User, db: Session) -> None:
    """Mark the one-time VIP trial as used for a free user.
    Call this AFTER a VIP-gated action succeeds for a non-VIP user."""
    if user.subscription_tier != "VIP" and not user.vip_trial_used:
        user.vip_trial_used = True
        db.commit()


def _reset_daily_if_new_day(user: User) -> None:
    today = date.today()
    if user.daily_recommendation_date != today:
        user.daily_recommendation_count = 0
        user.daily_recommendation_date = today


def check_daily_recommendation_limit(user: User, db: Session) -> None:
    """Raise 429 if free user has hit the daily AI recommendation cap.
    VIP users are unlimited. Resets at calendar-day boundary."""
    if user.subscription_tier == "VIP":
        return
    _reset_daily_if_new_day(user)
    settings = get_settings()
    if user.daily_recommendation_count >= settings.free_daily_recommendations:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="DAILY_LIMIT_REACHED",
        )
    db.commit()


def consume_daily_recommendation(user: User, db: Session) -> None:
    """Increment daily counter. Call AFTER a successful AI recommendation."""
    if user.subscription_tier == "VIP":
        return
    _reset_daily_if_new_day(user)
    user.daily_recommendation_count += 1
    db.commit()
