from fastapi import APIRouter, HTTPException, Depends, Header, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from enum import Enum

from app.db.database import get_db
from app.db.models import StylePreferences, User

router = APIRouter()


class PriceRange(str, Enum):
    BUDGET = "BUDGET"
    MID_RANGE = "MID_RANGE"
    LUXURY = "LUXURY"


class StylePreferencesSchema(BaseModel):
    occasion: Optional[str] = None
    weather: Optional[str] = None
    dress_code: Optional[str] = None
    preferred_styles: list[str] = []
    avoided_styles: list[str] = []
    price_range: PriceRange = PriceRange.MID_RANGE
    preferred_brands: list[str] = []
    excluded_brands: list[str] = []

    class Config:
        from_attributes = True


def get_user_by_uid(firebase_uid: str, db: Session) -> User:
    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Firebase UID header",
        )
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("", response_model=StylePreferencesSchema)
def get_style_preferences(
    x_firebase_uid: str = Header(...),
    db: Session = Depends(get_db),
):
    user = get_user_by_uid(x_firebase_uid, db)
    prefs = db.query(StylePreferences).filter(StylePreferences.user_id == user.id).first()
    if not prefs:
        raise HTTPException(status_code=404, detail="Style preferences not found")
    return prefs


@router.post("", response_model=StylePreferencesSchema)
def upsert_style_preferences(
    data: StylePreferencesSchema,
    x_firebase_uid: str = Header(...),
    db: Session = Depends(get_db),
):
    user = get_user_by_uid(x_firebase_uid, db)
    prefs = db.query(StylePreferences).filter(StylePreferences.user_id == user.id).first()
    if prefs:
        prefs.occasion = data.occasion
        prefs.weather = data.weather
        prefs.dress_code = data.dress_code
        prefs.preferred_styles = data.preferred_styles
        prefs.avoided_styles = data.avoided_styles
        prefs.price_range = data.price_range
        prefs.preferred_brands = data.preferred_brands
        prefs.excluded_brands = data.excluded_brands
    else:
        prefs = StylePreferences(user_id=user.id, **data.dict())
        db.add(prefs)

    db.commit()
    db.refresh(prefs)
    return prefs
