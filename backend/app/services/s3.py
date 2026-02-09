import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile
import uuid
from app.config import get_settings

settings = get_settings()


def get_s3_client():
    """Get S3 client with configured credentials."""
    return boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )


async def upload_file_to_s3(
    file: UploadFile,
    folder: str = "profile-pictures",
) -> str:
    """
    Upload a file to S3 and return the public URL.

    Args:
        file: The uploaded file
        folder: S3 folder/prefix for the file

    Returns:
        The public URL of the uploaded file
    """
    s3_client = get_s3_client()

    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if file.filename else "jpg"
    unique_filename = f"{folder}/{uuid.uuid4()}.{file_extension}"

    # Read file content
    file_content = await file.read()

    # Upload to S3
    try:
        s3_client.put_object(
            Bucket=settings.s3_bucket,
            Key=unique_filename,
            Body=file_content,
            ContentType=file.content_type or "image/jpeg",
        )
    except ClientError as e:
        raise Exception(f"Failed to upload file to S3: {e}")

    # Return the public URL
    url = f"https://{settings.s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{unique_filename}"
    return url


async def delete_file_from_s3(file_url: str) -> bool:
    """
    Delete a file from S3 by its URL.

    Args:
        file_url: The full URL of the file to delete

    Returns:
        True if deletion was successful
    """
    s3_client = get_s3_client()

    # Extract the key from the URL
    # URL format: https://bucket.s3.region.amazonaws.com/key
    try:
        key = file_url.split(f"{settings.s3_bucket}.s3.{settings.aws_region}.amazonaws.com/")[1]
    except IndexError:
        return False

    try:
        s3_client.delete_object(
            Bucket=settings.s3_bucket,
            Key=key,
        )
        return True
    except ClientError:
        return False
