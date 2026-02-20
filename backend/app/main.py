from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import health, users, upload, measurements, sizing

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="AI-powered fashion recommendation API",
    version="0.1.0",
)

# CORS middleware
import os
import json

# CORS origins from env var or defaults
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,https://attireai-cyan.vercel.app")

# Handle both JSON array and comma-separated formats
try:
    origins = json.loads(cors_origins_str)
except json.JSONDecodeError:
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
app.include_router(upload.router, prefix="/upload", tags=["Upload"])
app.include_router(measurements.router, prefix="/measurements", tags=["Measurements"])
app.include_router(sizing.router, prefix="/sizing", tags=["Sizing"])


@app.get("/")
async def root():
    return {"message": "Welcome to AttireAI API", "docs": "/docs"}
