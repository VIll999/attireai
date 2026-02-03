# AttireAI

AI-powered fashion recommendation application for CS 407 Senior Project.

## Team

- Yuanfei Song
- Yichen Dai
- Congtian Wu
- Ekaterina Tszyao

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS 4 |
| Backend | FastAPI, Python 3.12, SQLAlchemy |
| Database | MySQL 9.4 (Railway) |
| Auth | Firebase Authentication (planned) |
| Storage | AWS S3 (planned) |
| Hosting | Vercel (frontend), Railway (backend + database) |

## Project Structure

```
attireai/
├── src/                    # Next.js frontend
│   └── app/                # App Router pages
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI entry point
│   │   ├── config.py       # Settings
│   │   ├── routers/        # API endpoints
│   │   ├── models/         # Pydantic models
│   │   ├── services/       # Business logic
│   │   └── db/             # Database utilities
│   ├── requirements.txt
│   └── Dockerfile
├── scripts/                # Development scripts
│   ├── setup.sh            # Initial project setup
│   ├── start-local.sh      # Start both servers
│   ├── start-backend.sh    # Start backend only
│   ├── start-frontend.sh   # Start frontend only
│   └── stop-all.sh         # Stop all servers
└── docs/                   # Documentation
```

## Live URLs

| Environment | URL |
|-------------|-----|
| Frontend (Vercel) | https://attireai.vercel.app |
| Backend (Railway) | https://attireai-production.up.railway.app |
| API Docs | https://attireai-production.up.railway.app/docs |

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/VIll999/attireai.git
cd attireai

# 2. Run setup (installs all dependencies)
./scripts/setup.sh

# 3. Start local development
./scripts/start-local.sh
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Available Scripts

| Script | Description |
|--------|-------------|
| `./scripts/setup.sh` | Install dependencies, create .env files |
| `./scripts/start-local.sh` | Start frontend + backend |
| `./scripts/start-backend.sh [port]` | Start backend (default: 8000) |
| `./scripts/start-frontend.sh` | Start frontend |
| `./scripts/stop-all.sh` | Stop all running servers |
| `./scripts/lint.sh` | Run linters |

## Documentation

- [Setup Guide](docs/SETUP.md) - Detailed setup instructions
- [Changelog](CHANGELOG.md) - Version history and updates

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Welcome message |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI documentation |
| POST | `/users/` | Create user |
| GET | `/users/me` | Get current user |

*More endpoints coming soon*

## Database

MySQL hosted on Railway. See [docs/SETUP.md](docs/SETUP.md) for connection details.

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "Add your feature"`
3. Push to branch: `git push origin feature/your-feature`
4. Create a Pull Request
5. Update CHANGELOG.md with your changes
