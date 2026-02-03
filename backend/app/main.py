from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import health, users

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="AI-powered fashion recommendation API",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(users.router, prefix="/users", tags=["Users"])


@app.get("/")
async def root():
    return {"message": "Welcome to AttireAI API", "docs": "/docs"}
