from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserCreate, UserResponse

router = APIRouter()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate):
    # TODO: Implement user creation with Firebase
    return UserResponse(
        id="temp-id",
        email=user.email,
        name=user.name,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user():
    # TODO: Implement Firebase auth verification
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )
