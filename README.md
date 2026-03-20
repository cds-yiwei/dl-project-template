# DL Project Template

Monorepo for a FastAPI backend and a Vite + React frontend.

This root README summarizes the repository, quick-start commands, and where to find detailed docs for each part.

## Repository layout

- `backend/` — FastAPI application and backend tooling (detailed boilerplate with OIDC, Redis sessions, Casbin, Postgres, ARQ jobs)
  - `src/` — Python package and app code
  - `tests/` — pytest test suite and helpers
  - `docker-compose.yml`, `Dockerfile` — container/dev orchestration
  - `docs/`, `mkdocs.yml` — backend documentation site (rich guides and examples)
- `frontend/` — Vite + React (TypeScript) frontend (TanStack Router/Query, Tailwind, Vitest, Playwright)
  - `src/` — React source, routes, components
  - `public/` — static assets
  - `package.json`, `pnpm-lock.yaml` — frontend tooling and scripts
- `test-results/`, `tests/` — test artifacts and e2e reports

## Backend (FastAPI) — Highlights

- Async FastAPI app with SQLAlchemy 2.0 and Alembic migrations
- Pydantic v2 models, OIDC via Authlib, Redis-backed server sessions, JWT fallback for tests
- Casbin authorization decorators, rate limiting, ARQ background jobs, caching helpers
- Multiple deployment modes: local (uvicorn), staging (gunicorn + uvicorn workers), production (nginx)

For full backend docs and configuration, see `backend/README.md` and the site at `backend/docs/`.

Quick local backend start (minimal):

The backend uses the provided setup script and `uv` task runner. Recommended flow:

```
cd backend
./setup.py            # choose local/staging/production or run './setup.py local'

# start development environment (uses the 'uv' task runner shown in backend README)
uv sync --group dev --extra dev
uv run uvicorn src.app.main:app --reload --host 127.0.0.1 --port 8000
```

Common backend tasks:

```
# Run tests
pytest -q

# Run migrations
cd backend/src && uv run alembic upgrade head

# Start with docker compose (local)
cd backend
docker compose up --build
```

## Frontend (Vite + React) — Highlights

- TypeScript + Vite, Tailwind CSS, TanStack Router/Query/Table, React Hook Form, Zod
- Dev tooling: Vitest (unit), Playwright (E2E), Storybook, TanStack devtools
- Package management: `pnpm` recommended; Husky + Commitizen + Commitlint configured

Quick local frontend start:

```sh
cd frontend
pnpm install
pnpm run dev
```

Common frontend commands:

```sh
cd frontend && pnpm run lint
cd frontend && pnpm run test:unit
cd frontend && pnpm run test:e2e
cd frontend && pnpm run build
```

## Full stack with Docker

The `backend/docker-compose.yml` can run the backend and required services (Postgres, Redis). The frontend can be built and served by a static server or included in a multi-service compose stack.

Example (from `backend/`):

```
cd backend
docker compose up --build
```

## Configuration & environment

- Backend: create `backend/src/.env` (or copy from examples) and set `ENVIRONMENT`, DB, Redis, OIDC, and session variables.
- Frontend: environment variables for API base URLs can be set via Vite's `import.meta.env` or `.env` files in `frontend/`.

Do NOT commit secrets or `.env` files to source control.

## Testing

- Backend tests: `backend/tests/` using `pytest`.
- Frontend unit tests: `vitest` (see `frontend/package.json`).
- Frontend E2E: Playwright reports are stored under `frontend/playwright-report/`.

## Devtools & utilities

- Frontend includes TanStack devtools, Storybook, and helper components under `frontend/src/components/utils/development-tools`.
- Backend provides management scripts in `backend/scripts/` for different deployment modes.

## Contributing

See the backend contribution and code-of-conduct files in `backend/CONTRIBUTING.md` and `backend/CODE_OF_CONDUCT.md` for guidelines. The frontend also contains development setup steps in `frontend/README.md`.

## Where to find more details

- Backend full docs and guides: `backend/docs/` and `backend/README.md`.
- Frontend detailed README and package list: `frontend/README.md`.

