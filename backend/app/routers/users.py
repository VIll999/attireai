from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.db.models import User
from app.models.user import UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.post("/sync", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def sync_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Sync user from Firebase to MySQL.
    Creates user if not exists, returns existing user if already exists.
    Called after Firebase authentication.
    """
    # Check if user already exists by firebase_uid
    existing_user = db.query(User).filter(User.firebase_uid == user_data.firebase_uid).first()

    if existing_user:
        # Update user info if changed
        existing_user.name = user_data.name
        existing_user.email = user_data.email
        if user_data.profile_picture_url:
            existing_user.profile_picture_url = user_data.profile_picture_url
        db.commit()
        db.refresh(existing_user)
        return existing_user

    # Check if user exists by email (handles case where Firebase account was deleted and recreated)
    existing_by_email = db.query(User).filter(User.email == user_data.email).first()

    if existing_by_email:
        # Update firebase_uid and other info (user deleted Firebase account and created new one)
        existing_by_email.firebase_uid = user_data.firebase_uid
        existing_by_email.name = user_data.name
        if user_data.profile_picture_url:
            existing_by_email.profile_picture_url = user_data.profile_picture_url
        db.commit()
        db.refresh(existing_by_email)
        return existing_by_email

    # Create new user
    new_user = User(
        firebase_uid=user_data.firebase_uid,
        email=user_data.email,
        name=user_data.name,
        profile_picture_url=user_data.profile_picture_url,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Get current user by Firebase UID from header.
    """
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


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Update current user profile.
    """
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

    # Update fields if provided
    if user_data.name is not None:
        user.name = user_data.name
    if user_data.profile_picture_url is not None:
        user.profile_picture_url = user_data.profile_picture_url

    db.commit()
    db.refresh(user)

    return user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Delete current user by Firebase UID from header.
    """
    if not x_firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Firebase UID header",
        )

    user = db.query(User).filter(User.firebase_uid == x_firebase_uid).first()

    if user:
        db.delete(user)
        db.commit()

    return None
