from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Header, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

from app.db.database import get_db
from app.db.models import StylePreferences, StylePreset, User

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


class StylePresetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    occasion: Optional[str] = None
    weather: Optional[str] = None
    dress_code: Optional[str] = None
    preferred_styles: list[str] = []


class StylePresetResponse(BaseModel):
    id: str
    name: str
    occasion: Optional[str]
    weather: Optional[str]
    dress_code: Optional[str]
    preferred_styles: list[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/presets", response_model=List[StylePresetResponse])
def list_presets(
    x_firebase_uid: str = Header(...),
    db: Session = Depends(get_db),
):
    user = get_user_by_uid(x_firebase_uid, db)
    rows = (
        db.query(StylePreset)
        .filter(StylePreset.user_id == user.id)
        .order_by(StylePreset.created_at.desc())
        .all()
    )
    return [
        StylePresetResponse(
            id=r.id,
            name=r.name,
            occasion=r.occasion,
            weather=r.weather,
            dress_code=r.dress_code,
            preferred_styles=r.preferred_styles or [],
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("/presets", response_model=StylePresetResponse, status_code=status.HTTP_201_CREATED)
def create_preset(
    body: StylePresetCreate,
    x_firebase_uid: str = Header(...),
    db: Session = Depends(get_db),
):
    user = get_user_by_uid(x_firebase_uid, db)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Preset name is required")
    existing = (
        db.query(StylePreset)
        .filter(StylePreset.user_id == user.id, StylePreset.name == name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="A preset with this name already exists")
    preset = StylePreset(
        user_id=user.id,
        name=name,
        occasion=body.occasion,
        weather=body.weather,
        dress_code=body.dress_code,
        preferred_styles=body.preferred_styles,
    )
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return StylePresetResponse(
        id=preset.id,
        name=preset.name,
        occasion=preset.occasion,
        weather=preset.weather,
        dress_code=preset.dress_code,
        preferred_styles=preset.preferred_styles or [],
        created_at=preset.created_at,
    )


@router.delete("/presets/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_preset(
    preset_id: str,
    x_firebase_uid: str = Header(...),
    db: Session = Depends(get_db),
):
    user = get_user_by_uid(x_firebase_uid, db)
    preset = (
        db.query(StylePreset)
        .filter(StylePreset.id == preset_id, StylePreset.user_id == user.id)
        .first()
    )
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    db.delete(preset)
    db.commit()
    return None
