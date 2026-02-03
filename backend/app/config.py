from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "AttireAI API"
    debug: bool = False

    # Database
    database_url: str = "mysql+pymysql://user:password@localhost:3306/attireai"

    # Firebase
    firebase_credentials_path: str = "firebase-credentials.json"

    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    s3_bucket: str = "attireai"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "https://attireai.vercel.app"]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
