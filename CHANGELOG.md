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

## [0.5.0] - 2026-02-19

### Changed

#### Congtian Wu
- Redesigned UI with warm luxe fashion-brand aesthetic (amber/stone palette)
- Replaced emoji icons with SVG icons across landing page and dashboard
- Extracted shared `AppNav` component, eliminating ~130 lines of nav duplication
- Updated typography: tracking-wide brand name, tighter hero headings, uppercase labels
- Updated CTA section to dark luxe gradient with gold text
- Updated auth branding panel to dark stone gradient
- Updated README with current endpoints, URLs, and project structure
- Enabled branch protection on `main` (requires 1 approving review)

---

## [0.4.0] - 2026-02-19

### Added

#### Congtian Wu
- Dark mode support with smooth theme transitions across all pages
- Internationalization (i18n) with English, Chinese, and Spanish translations
- Language selector component in navigation
- Theme toggle button in navigation
- LocaleContext and ThemeContext providers

---

## [0.3.0] - 2026-02-17

### Added

#### Congtian Wu
- Profile management page with name editing and profile picture upload
- AWS S3 integration for profile picture storage
- CloudFront CDN for serving profile pictures
- Profile picture upload API endpoint (`POST /upload/profile-picture`)
- User profile update API endpoint (`PUT /users/me`)
- User delete API endpoint (`DELETE /users/me`)
- Measurement profiles with full CRUD operations
- Unit conversion support (metric/imperial) for measurements
- Measurement API endpoints: `GET/POST /measurements`, `PUT/DELETE /measurements/{id}`
- Email verification flow with polling and resend cooldown
- Password reset functionality
- Password strength validation on signup
- Optimized user data fetching with context caching

### Fixed

#### Congtian Wu
- CORS configuration to handle JSON array format
- `is_primary` flag not applied when creating new measurement profile

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
