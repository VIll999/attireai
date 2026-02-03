FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app ./app

# Expose port (Railway provides PORT env var)
EXPOSE ${PORT:-8000}

# Run server
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
