from pydantic import BaseModel, EmailStr
from typing import Optional


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: str

    class Config:
        from_attributes = True


class UserProfile(UserResponse):
    height: Optional[float] = None
    weight: Optional[float] = None
    body_type: Optional[str] = None
    skin_tone: Optional[str] = None
    hair_color: Optional[str] = None
    style_preferences: Optional[list[str]] = None
