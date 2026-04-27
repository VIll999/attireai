from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CheckoutRequest(BaseModel):
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str


class SubscriptionStatusResponse(BaseModel):
    tier: str
    status: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    vip_trial_used: bool = False
    is_admin: bool = False
    monthly_price_usd: float


class StripeConfigResponse(BaseModel):
    publishable_key: str
    monthly_price_usd: float
