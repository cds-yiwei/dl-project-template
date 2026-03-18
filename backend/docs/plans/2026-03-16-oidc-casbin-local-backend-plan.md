# OIDC, Casbin, and Local Backend DX Implementation Plan

## Goal

Introduce provider-agnostic OIDC authentication with Authlib, add decorator-based Casbin authorization backed by PostgreSQL, support non-Docker backend development under `backend/.venv`, and document the resulting developer workflow.

## Decisions

- OIDC is the primary user authentication path.
- Local username/password login remains available only as an explicitly configurable fallback.
- Session auth is primary for OIDC users; bearer tokens remain for the local fallback and transitional compatibility.
- Authorization uses `casbin-fastapi-decorator` with per-route `PermissionGuard` decorators.
- Phase-one Casbin coverage is limited to admin-heavy routes.
- Local development assumes PostgreSQL and Redis are available outside Docker.

## Implementation Batches

### Batch 1: Auth foundations

- Add Authlib, session middleware support, and Casbin decorator dependencies.
- Refactor auth dependencies to resolve users from session first and bearer tokens second.
- Extend the user model and schemas for external identity fields and passwordless OIDC users.
- Make local password login explicitly configurable.

### Batch 2: OIDC login flow

- Add OIDC settings for discovery metadata, client credentials, redirect behavior, and session configuration.
- Add OIDC helpers to register the Authlib client, normalize usernames, and upsert OIDC users.
- Add `/api/v1/auth/oidc/login` and `/api/v1/auth/oidc/callback` routes.
- Persist the authenticated user ID in the backend session on callback.

### Batch 3: Authorization

- Add a PostgreSQL-backed access-policy model.
- Add a Casbin model configuration and a shared `PermissionGuard`.
- Map superusers to the Casbin subject `admin` and regular users to their usernames.
- Decorate the admin-heavy tier, rate-limit, and user-admin routes.

### Batch 4: Developer workflow

- Add a VS Code launch configuration for local FastAPI debugging.
- Update `backend/setup.py` to describe the non-Docker `uv` workflow more clearly.
- Update `backend/README.md` with the current auth model, OIDC env vars, local setup, and debug instructions.

## Verification

- Focused auth tests for session resolution, OIDC user sync, local login gating, and logout behavior.
- Casbin subject-provider tests.
- Manual local verification of OIDC callback, session creation, and protected admin-heavy routes.
- VS Code launch validation with the backend running from `backend/`.

## Follow-up Work

- Add Alembic migrations for the new user fields and access-policy table.
- Add policy seed scripts for initial route permissions.
- Extend docs under `backend/docs/getting-started` and `backend/docs/user-guide/authentication`.
- Add integration tests covering decorated routes with a seeded policy table.