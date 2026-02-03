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
import os

# CORS origins from env var or defaults
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,https://attireai-cyan.vercel.app")
origins = [origin.strip() for origin in cors_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(users.router, prefix="/users", tags=["Users"])


@app.get("/")
async def root():
    return {"message": "Welcome to AttireAI API", "docs": "/docs"}
