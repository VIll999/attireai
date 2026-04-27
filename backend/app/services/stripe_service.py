import stripe
from typing import Optional

from app.config import get_settings

settings = get_settings()
stripe.api_key = settings.stripe_secret_key


def get_or_create_customer(user_id: str, email: str, name: Optional[str], stripe_customer_id: Optional[str]) -> str:
    if stripe_customer_id:
        try:
            customer = stripe.Customer.retrieve(stripe_customer_id)
            if not getattr(customer, "deleted", False):
                return customer.id
        except stripe.error.InvalidRequestError:
            pass
    customer = stripe.Customer.create(
        email=email,
        name=name or email,
        metadata={"app_user_id": user_id},
    )
    return customer.id


def create_checkout_session(
    customer_id: str,
    success_url: str,
    cancel_url: str,
) -> stripe.checkout.Session:
    if not settings.stripe_price_id:
        raise ValueError("STRIPE_PRICE_ID not configured")
    return stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": settings.stripe_price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        allow_promotion_codes=True,
    )


def cancel_subscription(stripe_subscription_id: str, at_period_end: bool = True) -> stripe.Subscription:
    """Cancel subscription. By default, cancels at period end so user keeps access until billing cycle ends."""
    if at_period_end:
        return stripe.Subscription.modify(stripe_subscription_id, cancel_at_period_end=True)
    return stripe.Subscription.delete(stripe_subscription_id)


def reactivate_subscription(stripe_subscription_id: str) -> stripe.Subscription:
    return stripe.Subscription.modify(stripe_subscription_id, cancel_at_period_end=False)


def get_subscription(stripe_subscription_id: str) -> stripe.Subscription:
    return stripe.Subscription.retrieve(stripe_subscription_id)


def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
    if not settings.stripe_webhook_secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET not configured")
    return stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
