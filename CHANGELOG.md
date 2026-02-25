# Changelog

All notable changes to this project will be documented in this file.

Format: Each team member should add their changes under the current date with their name.

---

## [0.7.0] - 2026-02-25

### Changed

#### Congtian Wu
- Reworked recommendations page to use `measurement_id`-based data flow instead of redundant form inputs
- Recommendations page now fetches and displays user's measurements, color profile, and style preferences as a summary
- Added measurement profile dropdown selector (auto-selects from URL param or primary profile)
- Moved `occasion`, `weather`, `dress_code` fields from `outfit_recommendations` table into `style_preferences` table
- Style preferences page now saves occasion/weather/dress_code alongside styles/budget/brands in a single API call
- Style preferences page now pre-populates all saved fields (occasion, weather, dress code, styles, budget, brands) on revisit
- Style preferences redirect simplified to only pass `measurement_id` to recommendations page
- Fixed dashboard "Edit Preferences" link to point to `/style-preferences` instead of `/style`

### Added

#### Congtian Wu
- Migration `005_add_occasion_fields_to_style_preferences.sql` for new columns
- `occasion`, `weather`, `dress_code` columns on `style_preferences` DB model and API schema

---

## [0.6.0] - 2026-02-25

### Added

#### Congtian Wu
- Dual AI provider support (Gemini + OpenAI) with `AI_PROVIDER` env var
- Gemini integration using `google-genai` SDK with Google Search grounding
- Lazy AI service initialization to prevent backend crash when API keys are missing
- Primary profile toggle on measurements page
- Input auto-clamping on blur for measurement fields

#### Yichen (merged from Yichen_branch)
- AI recommendation engine with web search (`/recommendations/ai-products`)
- `RecommendationItem`, `SavedOutfit`, `VirtualTryOn`, `Subscription` DB models
- Recommendations page with product cards, category grouping, and item display

### Changed

#### Congtian Wu
- Tightened measurement input ranges to realistic human values (height 40-300cm, chest 30-180cm, etc.)
- Added pydantic Field validation on backend measurement models
- Made `occasion`, `weather`, `dress_code` Optional in outfit recommendation response model
- Swapped ProfileContext from `getOutfitRecommendations` to `getStylePreferences` to avoid unnecessary API calls
- Fixed recommendations page to use Next.js proxy instead of hardcoded backend URL

### Fixed

#### Congtian Wu
- 500 error on `GET /outfit-recommendations` caused by nullable fields failing pydantic validation
- Measurement save allowing values exceeding DB `Numeric(5,2)` limit (999.99)
- Style preferences API using wrong auth pattern (path param instead of `X-Firebase-UID` header)
- Build failure from Kate's branch (`activePage="style"` type mismatch)
- Backend crash on startup when AI API keys not configured

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
