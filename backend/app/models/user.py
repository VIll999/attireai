from pydantic import BaseModel, EmailStr

from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(BaseModel):
    """Data from Firebase after authentication"""
    firebase_uid: str
    email: EmailStr
    name: str
    profile_picture_url: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    firebase_uid: str
    name: str
    profile_picture_url: Optional[str] = None
    subscription_tier: str = "FREE"
    vip_trial_used: bool = False
    is_admin: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfile(UserResponse):
    """Extended user profile with measurements, etc."""
    has_measurements: bool = False
    has_color_profile: bool = False
    has_style_preferences: bool = False
    profile_completion: int = 0


class UserUpdate(BaseModel):
    """Data for updating user profile"""
    name: Optional[str] = None
    profile_picture_url: Optional[str] = None
