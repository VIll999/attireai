# Changelog

All notable changes to this project will be documented in this file.

Format: Each team member should add their changes under the current date with their name.

---

## [Unreleased]

### Added
- *Add upcoming features here*

### Changed
- *Add changes here*

### Fixed
- *Add bug fixes here*

---

## [0.2.0] - 2026-02-03

### Added

#### Congtian Wu
- Landing page with hero section, features, and CTA
- Authentication page with email/password and Google sign-in
- Dashboard page with profile completion and quick actions
- Firebase Authentication integration
- User sync from Firebase to MySQL database
- SQLAlchemy User model matching database schema
- API endpoints: `POST /users/sync`, `GET /users/me`
- Frontend API client for backend calls
- AuthContext with automatic user sync after login

### Fixed

#### Congtian Wu
- CORS configuration for Vercel deployment
- MySQL driver compatibility (mysql:// to mysql+pymysql://)
- Auth page build error with Suspense boundary

---

## [0.1.0] - 2026-02-03

### Added

#### Congtian Wu
- Initial project setup
- Next.js 16 frontend with React 19, TypeScript, TailwindCSS 4
- React Compiler enabled
- FastAPI backend with Python 3.12
- Project structure with `src/` (frontend) and `backend/` directories
- Development scripts in `scripts/` folder:
  - `setup.sh` - Project setup
  - `start-local.sh` - Start all services
  - `start-backend.sh` - Start backend
  - `start-frontend.sh` - Start frontend
  - `stop-all.sh` - Stop all services
  - `lint.sh` - Run linters
- Vercel deployment for frontend
- Railway deployment for backend
- Railway MySQL database with schema
- Database tables: users, measurement_profiles, color_profiles, style_preferences, outfit_recommendations, recommendation_items, saved_outfits, virtual_try_ons, subscriptions
- API proxy configuration (Next.js → FastAPI)
- Basic API endpoints: `/health`, `/users/`
- Project documentation (README, SETUP guide)

---

## How to Update This File

When you make changes:

1. Add your changes under `[Unreleased]` section
2. Include your name and what you changed
3. Use these categories:
   - **Added** - New features
   - **Changed** - Changes to existing features
   - **Fixed** - Bug fixes
   - **Removed** - Removed features

Example:
```markdown
#### Your Name
- Added user authentication with Firebase
- Fixed login redirect issue
```
