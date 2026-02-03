# Setup Guide

Complete setup instructions for AttireAI development.

## Prerequisites

- **Node.js** 18+ (recommend 20+)
- **Python** 3.11+
- **Git**
- **MySQL Workbench** (optional, for database management)

## Quick Setup

```bash
# Clone and setup
git clone https://github.com/VIll999/attireai.git
cd attireai
./scripts/setup.sh
```

This will:
- Install frontend dependencies (npm/pnpm)
- Create Python virtual environment
- Install backend dependencies
- Create `.env` files from templates

## Manual Setup

### 1. Frontend Setup

```bash
cd attireai

# Install dependencies
npm install
# or
pnpm install

# Create environment file
echo "BACKEND_URL=http://localhost:8000" > .env.local
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your database credentials
```

## Environment Variables

### Frontend (`.env.local`)

```env
BACKEND_URL=http://localhost:8000
```

For production, this is set in Vercel dashboard.

### Backend (`backend/.env`)

```env
# App
DEBUG=true

# Database
DATABASE_URL=mysql+pymysql://USER:PASSWORD@HOST:PORT/DATABASE

# Firebase (add when ready)
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json

# AWS S3 (add when ready)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET=attireai

# CORS
CORS_ORIGINS=["http://localhost:3000","https://attireai.vercel.app"]
```

## Database Connection

### Railway MySQL (Production)

Our MySQL database is hosted on Railway.

**Connection Details:**

| Field | Value |
|-------|-------|
| Host | `tramway.proxy.rlwy.net` |
| Port | `50700` |
| Username | `root` |
| Password | *(ask team lead)* |
| Database | `railway` |

**For Local Development** (in `backend/.env`):
```
DATABASE_URL=mysql+pymysql://root:PASSWORD@tramway.proxy.rlwy.net:50700/railway
```

**For Railway Backend** (set in Railway dashboard):
```
DATABASE_URL=mysql+pymysql://root:PASSWORD@mysql.railway.internal:3306/railway
```

### MySQL Workbench

1. Open MySQL Workbench
2. Click **+** to add connection
3. Enter:
   - Hostname: `tramway.proxy.rlwy.net`
   - Port: `50700`
   - Username: `root`
   - Password: *(ask team lead)*
4. Test Connection → OK

## Running Locally

### Option 1: Using Scripts (Recommended)

```bash
# Start both frontend and backend
./scripts/start-local.sh

# Or start separately
./scripts/start-backend.sh    # Terminal 1
./scripts/start-frontend.sh   # Terminal 2
```

### Option 2: Manual

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## Deployment

### Frontend (Vercel)

Automatic deployment on push to `main` branch.

- Dashboard: https://vercel.com/dashboard
- Set `BACKEND_URL` in Environment Variables

### Backend (Railway)

Automatic deployment on push to `main` branch.

- Dashboard: https://railway.app/dashboard
- Set `DATABASE_URL` in Environment Variables

## Troubleshooting

### "Module not found" errors

```bash
# Frontend
npm install

# Backend
source venv/bin/activate
pip install -r requirements.txt
```

### Port already in use

```bash
./scripts/stop-all.sh
```

### Database connection failed

1. Check your `.env` file has correct credentials
2. Ensure you're using the PUBLIC URL for local development
3. Check Railway dashboard - is MySQL running?

### Backend won't start

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

## Team Contacts

| Name | Role |
|------|------|
| Congtian Wu | Backend, DevOps |
| *(add others)* | |

## Useful Links

- [GitHub Repo](https://github.com/VIll999/attireai)
- [Vercel Dashboard](https://vercel.com)
- [Railway Dashboard](https://railway.app)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Docs](https://nextjs.org/docs)
