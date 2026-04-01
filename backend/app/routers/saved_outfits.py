from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import SavedOutfit, User, OutfitRecommendation


router = APIRouter()


# --- Helper Functions ---


def get_user_by_uid(firebase_uid: str, db: Session) -> User:
    """Helper to get user by Firebase UID or raise 401/404."""
    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Firebase UID header",
        )
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


# --- Request/Response Models ---


class SaveOutfitRequest(BaseModel):
    recommendation_id: str
    collection_name: str = "Favorites"


class UpdateSavedOutfitRequest(BaseModel):
    collection_name: Optional[str] = None
    is_purchased: Optional[bool] = None


class SavedOutfitResponse(BaseModel):
    id: str
    user_id: str
    recommendation_id: str
    collection_name: str
    is_purchased: bool
    try_on_image_url: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class SavedOutfitWithDetailsResponse(SavedOutfitResponse):
    """Saved outfit with full recommendation details"""
    recommendation: Optional[dict] = None


# --- Endpoints ---


@router.post("/saved-outfits", response_model=SavedOutfitResponse, status_code=status.HTTP_201_CREATED)
def save_outfit(
    data: SaveOutfitRequest,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Save an outfit to favorites or a custom collection.

    - Checks if outfit is already saved by this user
    - Creates new saved_outfits entry
    - Returns the saved outfit details
    """
    user = get_user_by_uid(x_firebase_uid, db)

    # Check if recommendation exists
    recommendation = db.query(OutfitRecommendation).filter(
        OutfitRecommendation.id == data.recommendation_id
    ).first()

    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )

    # Check if already saved
    existing = db.query(SavedOutfit).filter(
        SavedOutfit.user_id == user.id,
        SavedOutfit.recommendation_id == data.recommendation_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Outfit already saved"
        )

    # Create saved outfit
    saved_outfit = SavedOutfit(
        user_id=user.id,
        recommendation_id=data.recommendation_id,
        collection_name=data.collection_name,
    )

    db.add(saved_outfit)
    db.commit()
    db.refresh(saved_outfit)

    # Convert to response with ISO format datetime
    return SavedOutfitResponse(
        id=saved_outfit.id,
        user_id=saved_outfit.user_id,
        recommendation_id=saved_outfit.recommendation_id,
        collection_name=saved_outfit.collection_name,
        is_purchased=saved_outfit.is_purchased,
        try_on_image_url=saved_outfit.try_on_image_url,
        created_at=saved_outfit.created_at.isoformat() if saved_outfit.created_at else "",
    )


@router.get("/saved-outfits", response_model=List[SavedOutfitWithDetailsResponse])
def get_saved_outfits(
    collection_name: Optional[str] = None,
    is_purchased: Optional[bool] = None,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Get all saved outfits for the current user.

    - Optional filters: collection_name, is_purchased
    - Returns saved outfits with full recommendation details (items, occasion, etc.)
    - Ordered by created_at DESC (newest first)
    """
    user = get_user_by_uid(x_firebase_uid, db)

    query = db.query(SavedOutfit).filter(SavedOutfit.user_id == user.id)

    if collection_name:
        query = query.filter(SavedOutfit.collection_name == collection_name)

    if is_purchased is not None:
        query = query.filter(SavedOutfit.is_purchased == is_purchased)

    saved_outfits = query.order_by(SavedOutfit.created_at.desc()).all()

    # Build response with recommendation details
    results = []
    for saved in saved_outfits:
        # Get full recommendation with items
        recommendation = db.query(OutfitRecommendation).filter(
            OutfitRecommendation.id == saved.recommendation_id
        ).first()

        rec_dict = None
        if recommendation:
            # Convert recommendation to dict with items
            rec_dict = {
                "id": recommendation.id,
                "occasion": recommendation.occasion,
                "weather": recommendation.weather,
                "dress_code": recommendation.dress_code,
                "total_price": recommendation.total_price,
                "reasoning": recommendation.reasoning,
                "user_rating": recommendation.user_rating,
                "created_at": recommendation.created_at.isoformat() if recommendation.created_at else None,
                "items": [
                    {
                        "id": item.id,
                        "name": item.name,
                        "brand": item.brand,
                        "category": item.category,
                        "price": item.price,
                        "currency": item.currency,
                        "image_url": item.image_url,
                        "purchase_url": item.purchase_url,
                        "recommended_size": item.recommended_size,
                        "recommended_color": item.colors,
                        "outfit_index": item.outfit_index,
                    }
                    for item in recommendation.items
                ]
            }

        results.append({
            "id": saved.id,
            "user_id": saved.user_id,
            "recommendation_id": saved.recommendation_id,
            "collection_name": saved.collection_name,
            "is_purchased": saved.is_purchased,
            "try_on_image_url": saved.try_on_image_url,
            "created_at": saved.created_at.isoformat() if saved.created_at else None,
            "recommendation": rec_dict,
        })

    return results


@router.get("/saved-outfits/{saved_outfit_id}", response_model=SavedOutfitWithDetailsResponse)
def get_saved_outfit(
    saved_outfit_id: str,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Get a specific saved outfit with full details"""
    user = get_user_by_uid(x_firebase_uid, db)

    saved_outfit = db.query(SavedOutfit).filter(
        SavedOutfit.id == saved_outfit_id,
        SavedOutfit.user_id == user.id
    ).first()

    if not saved_outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved outfit not found"
        )

    # Get full recommendation
    recommendation = db.query(OutfitRecommendation).filter(
        OutfitRecommendation.id == saved_outfit.recommendation_id
    ).first()

    rec_dict = None
    if recommendation:
        rec_dict = {
            "id": recommendation.id,
            "occasion": recommendation.occasion,
            "weather": recommendation.weather,
            "dress_code": recommendation.dress_code,
            "total_price": recommendation.total_price,
            "reasoning": recommendation.reasoning,
            "user_rating": recommendation.user_rating,
            "created_at": recommendation.created_at.isoformat() if recommendation.created_at else None,
            "items": [
                {
                    "id": item.id,
                    "name": item.name,
                    "brand": item.brand,
                    "category": item.category,
                    "price": item.price,
                    "currency": item.currency,
                    "image_url": item.image_url,
                    "purchase_url": item.purchase_url,
                    "recommended_size": item.recommended_size,
                    "recommended_color": item.colors,
                    "outfit_index": item.outfit_index,
                }
                for item in recommendation.items
            ]
        }

    return {
        "id": saved_outfit.id,
        "user_id": saved_outfit.user_id,
        "recommendation_id": saved_outfit.recommendation_id,
        "collection_name": saved_outfit.collection_name,
        "is_purchased": saved_outfit.is_purchased,
        "try_on_image_url": saved_outfit.try_on_image_url,
        "created_at": saved_outfit.created_at.isoformat() if saved_outfit.created_at else None,
        "recommendation": rec_dict,
    }


@router.put("/saved-outfits/{saved_outfit_id}", response_model=SavedOutfitResponse)
def update_saved_outfit(
    saved_outfit_id: str,
    data: UpdateSavedOutfitRequest,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Update a saved outfit.

    - Can update collection_name (move to different collection)
    - Can update is_purchased (mark as purchased)
    """
    user = get_user_by_uid(x_firebase_uid, db)

    saved_outfit = db.query(SavedOutfit).filter(
        SavedOutfit.id == saved_outfit_id,
        SavedOutfit.user_id == user.id
    ).first()

    if not saved_outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved outfit not found"
        )

    # Update fields if provided
    if data.collection_name is not None:
        saved_outfit.collection_name = data.collection_name

    if data.is_purchased is not None:
        saved_outfit.is_purchased = data.is_purchased

    db.commit()
    db.refresh(saved_outfit)

    # Convert to response with ISO format datetime
    return SavedOutfitResponse(
        id=saved_outfit.id,
        user_id=saved_outfit.user_id,
        recommendation_id=saved_outfit.recommendation_id,
        collection_name=saved_outfit.collection_name,
        is_purchased=saved_outfit.is_purchased,
        try_on_image_url=saved_outfit.try_on_image_url,
        created_at=saved_outfit.created_at.isoformat() if saved_outfit.created_at else "",
    )


@router.delete("/saved-outfits/{saved_outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_outfit(
    saved_outfit_id: str,
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Unsave/remove a saved outfit.

    - Permanently deletes the saved outfit entry
    - Does not delete the original recommendation
    """
    user = get_user_by_uid(x_firebase_uid, db)

    saved_outfit = db.query(SavedOutfit).filter(
        SavedOutfit.id == saved_outfit_id,
        SavedOutfit.user_id == user.id
    ).first()

    if not saved_outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved outfit not found"
        )

    db.delete(saved_outfit)
    db.commit()

    return None


@router.get("/saved-outfits-collections", response_model=List[str])
def get_collections(
    x_firebase_uid: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Get list of unique collection names for the current user.

    - Returns distinct collection names
    - Useful for displaying collection filter/selector in UI
    """
    user = get_user_by_uid(x_firebase_uid, db)

    collections = db.query(SavedOutfit.collection_name).filter(
        SavedOutfit.user_id == user.id
    ).distinct().all()

    return [c[0] for c in collections]
