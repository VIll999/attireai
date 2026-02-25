from fastapi import APIRouter, HTTPException, Depends
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
    preferred_styles: list[str] = []
    avoided_styles: list[str] = []
    price_range: PriceRange = PriceRange.MID_RANGE
    preferred_brands: list[str] = []
    excluded_brands: list[str] = []

    class Config:
        from_attributes = True


@router.get("/{firebase_uid}", response_model=StylePreferencesSchema)
def get_style_preferences(firebase_uid: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    prefs = db.query(StylePreferences).filter(StylePreferences.user_id == user.id).first()
    if not prefs:
        raise HTTPException(status_code=404, detail="Style preferences not found")
    return prefs


@router.post("/{firebase_uid}", response_model=StylePreferencesSchema)
def upsert_style_preferences(
    firebase_uid: str,
    data: StylePreferencesSchema,
    db: Session = Depends(get_db)
):
    # Use firebase_uid to find user in database
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # use user.id to save preferences
    prefs = db.query(StylePreferences).filter(StylePreferences.user_id == user.id).first()
    if prefs:
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