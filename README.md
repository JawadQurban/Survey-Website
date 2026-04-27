# TFA Survey Platform

Bilingual (Arabic/English) survey platform for The Financial Academy Training Landscape Study.

Built with FastAPI + React + MySQL. Supports three respondent roles (CEO, CHRO, L&D Leader), email-OTP verification without login, a full admin portal, and multi-survey capability.

---

## Architecture

```
Survey System/
├── backend/          FastAPI API server (Python 3.11)
│   ├── app/
│   │   ├── api/      REST endpoints (public + admin)
│   │   ├── core/     Config, database, logging
│   │   ├── models/   SQLAlchemy ORM models
│   │   ├── schemas/  Pydantic request/response models
│   │   ├── services/ Business logic
│   │   ├── repositories/ Data access layer
│   │   └── security/ JWT + password hashing
│   ├── migrations/   Alembic migrations
│   ├── scripts/      Excel import seed script
│   └── tests/
├── frontend/         React + TypeScript + Tailwind
│   └── src/
│       ├── features/ Public survey + admin portal pages
│       ├── components/ Shared UI components
│       ├── store/    Zustand state
│       └── lib/      API client, i18n, query client
└── docker-compose.yml
```

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL 8.0+ (or use Docker Compose)
- Redis (optional — used for future rate limiting)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate       # macOS/Linux
venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials and SMTP settings

# Run database migrations
alembic upgrade head

# Import the Excel survey data
python scripts/seed_survey.py --xlsx "../04262027_TFA Strategy Refresh_Questionnaire Training Landscape Study_v3.xlsx"

# Start the API server
uvicorn app.main:app --reload --port 8000
```

API is running at: http://localhost:8000
API docs at: http://localhost:8000/docs

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Start dev server
npm run dev
```

Frontend is running at: http://localhost:5173

> In dev mode, Vite proxies `/api` requests to the backend on port 8000.

---

## Deploying with Docker

```bash
# 1. Copy and configure backend env
cp backend/.env.example backend/.env
# Fill in production values (MySQL password, SMTP, SECRET_KEY, etc.)

# 2. Build and start all services
docker compose up -d --build

# 3. Run migrations inside the container
docker compose exec backend alembic upgrade head

# 4. Seed the survey data
docker compose exec backend python scripts/seed_survey.py --xlsx /app/survey_data.xlsx

# 5. View logs
docker compose logs -f backend

# 6. Restart a service
docker compose restart backend
```

Services:
- Frontend (nginx): http://localhost:80
- Backend (FastAPI): http://localhost:8000
- MySQL: localhost:3306
- Redis: localhost:6379

---

## Running Tests

```bash
cd backend
source venv/bin/activate

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_auth.py -v
pytest tests/test_submissions.py -v

# Run security scan
bandit -r app/ -ll
```

---

## Pushing to Repository

### First time

```bash
git init
git add .
git commit -m "feat: initial TFA survey platform scaffold"
git remote add origin <your-repo-url>
git push -u origin main
```

### Ongoing updates

```bash
git status
git add backend/app/api/        # stage specific changes
git commit -m "feat(api): add question type validation"
git push
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `APP_ENV` | `development` or `production` |
| `SECRET_KEY` | Long random secret for JWT signing |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT access token lifetime (default: 60) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime (default: 30) |
| `MYSQL_HOST` | MySQL hostname |
| `MYSQL_PORT` | MySQL port (default: 3306) |
| `MYSQL_DATABASE` | Database name |
| `MYSQL_USER` | Database user |
| `MYSQL_PASSWORD` | Database password |
| `REDIS_URL` | Redis connection URL |
| `FRONTEND_URL` | Frontend origin for CORS |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM_EMAIL` | From address for sent emails |
| `OTP_EXPIRE_MINUTES` | OTP validity window (default: 10) |
| `RATE_LIMIT_ENABLED` | Enable rate limiting (default: true) |
| `FIRST_ADMIN_EMAIL` | Email for auto-created first admin |
| `FIRST_ADMIN_PASSWORD` | Password for auto-created first admin |

---

## Survey Roles

| Role | Key | Description |
|---|---|---|
| CEO | `ceo` | Most senior leader — 10 questions |
| CHRO | `chro` | Chief Human Resources Officer — 25 questions |
| L&D Leader | `ld` | Head of L&D — 24 questions |

Role-specific questions are controlled by `question_visibility_rules` in the database, seeded from the Excel workbook's Overview sheet.

---

## Public Survey Flow

1. User lands on `/` → reads about the study
2. User clicks "Begin Survey" → goes to `/verify`
3. User enters email → backend checks if it exists (without revealing whether it does)
4. OTP sent to registered email
5. User enters OTP → session cookie set → redirected to `/survey/:slug/overview`
6. User completes survey section by section
7. Draft auto-saved every 30 seconds
8. Final review at `/survey/:slug/review`
9. Submit → confirmation at `/survey/:slug/thank-you`

---

## Admin Portal

Access at `/admin/login`. First admin created automatically from `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` env variables.

Features:
- Dashboard with completion metrics per organization and role
- Organization and contact management
- Survey configuration and builder
- Submission view with CSV/XLSX export
- Ability to reopen submitted surveys
- CMS page management
- Full audit logging

---

## Security Architecture

- **Admin auth**: JWT access tokens (httpOnly cookie) + refresh token rotation with reuse detection
- **Respondent auth**: Email OTP — no password — session token in httpOnly cookie
- **Role isolation**: Every question has visibility rules; the API filters questions per session role
- **Duplicate prevention**: Unique constraint on `(organization_id, survey_id, respondent_role)` in submissions table
- **Rate limiting**: Verification attempts tracked per email/hour; no enumeration possible
- **SQL injection**: SQLAlchemy ORM only — no raw string interpolation
- **XSS**: DOMPurify on any rendered HTML; no dangerouslySetInnerHTML without sanitization
- **CORS**: Strict allow-origin from `FRONTEND_URL` only
- **Audit**: All admin actions logged to `admin_audit_logs`
