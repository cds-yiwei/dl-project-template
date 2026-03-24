# Department To User Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a first-class Department resource and allow each user to be assigned to one department through backend APIs and frontend admin flows.

**Architecture:** Mirror the existing tier resource for department CRUD, then mirror the existing user role and tier assignment flows for user-department reads and updates. Keep routers thin, place orchestration in services, expose UUID-based public contracts, and update the admin UI with a dedicated departments page plus user edit controls for department assignment.

**Tech Stack:** FastAPI, SQLAlchemy, FastCRUD, Alembic, Casbin, React, TanStack Router, TanStack Query, Vitest, pytest

---

### Task 1: Backend department tests

**Files:**
- Create: `backend/tests/test_department.py`
- Create: `backend/tests/test_department_service.py`
- Modify: `backend/tests/test_user.py`
- Modify: `backend/tests/test_user_service.py`

**Step 1: Write the failing tests**

Add endpoint-level tests for department CRUD routes that mirror tier coverage, and add user endpoint and service tests that cover reading and updating a user's department by UUID.

**Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/test_department.py tests/test_department_service.py tests/test_user.py tests/test_user_service.py -q`
Expected: FAIL because department routes, schemas, service methods, or user-department behavior do not exist yet.

**Step 3: Write minimal implementation**

Create the backend department feature and user assignment support with the smallest changes needed to satisfy the tests.

**Step 4: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/test_department.py tests/test_department_service.py tests/test_user.py tests/test_user_service.py -q`
Expected: PASS.

### Task 2: Backend department feature wiring

**Files:**
- Create: `backend/src/app/models/department.py`
- Create: `backend/src/app/schemas/department.py`
- Create: `backend/src/app/crud/crud_departments.py`
- Create: `backend/src/app/services/department_service.py`
- Create: `backend/src/app/api/v1/departments.py`
- Modify: `backend/src/app/models/user.py`
- Modify: `backend/src/app/schemas/user.py`
- Modify: `backend/src/app/services/user_service.py`
- Modify: `backend/src/app/api/v1/users.py`
- Modify: `backend/src/app/api/dependencies.py`
- Modify: `backend/src/app/services/__init__.py`
- Modify: `backend/src/app/api/v1/__init__.py`

**Step 1: Write the failing test**

Use the tests from Task 1 as the red step for this wiring work.

**Step 2: Run test to verify it fails**

Run the same targeted backend test command and confirm missing department behavior is the reason for failure.

**Step 3: Write minimal implementation**

Implement:
- department model, schema, CRUD adapter, service, dependency, and routes
- `department_id` on `User`
- `department_uuid` on public user payloads
- `UserDepartmentRead` and `UserDepartmentUpdate` schema contracts
- `get_user_department` and `update_user_department` service methods
- `/user/{user_uuid}/department` GET and PATCH endpoints

**Step 4: Run test to verify it passes**

Run the targeted backend tests again and confirm they pass.

### Task 3: Migration and policy seeding

**Files:**
- Create: `backend/src/migrations/versions/<timestamp>_add_departments.py`
- Modify: `backend/src/scripts/seed_access_policies.py`

**Step 1: Write the failing test**

If the repo has a migration or seed test harness already in scope, add a failing test there; otherwise use manual verification after implementation for this infrastructure layer.

**Step 2: Run test to verify it fails**

Run the most relevant targeted checks if a new test is added; otherwise note that this task is verified through Alembic upgrade and policy-aware route tests.

**Step 3: Write minimal implementation**

Add an Alembic migration that creates the `department` table, adds `department_id` to `user`, and seeds Casbin policies for `departments` read and write access where appropriate.

**Step 4: Run test to verify it passes**

Run: `cd backend/src && uv run alembic upgrade head`
Expected: PASS with the new schema in place.

### Task 4: Frontend department tests

**Files:**
- Create: `frontend/tests/unit/fetch/departments.test.ts`
- Create: `frontend/tests/unit/features/departments/use-department-management.test.ts`
- Create: `frontend/tests/unit/pages/DepartmentsPage.test.tsx`
- Modify: `frontend/tests/unit/pages/UsersPage.test.tsx`

**Step 1: Write the failing tests**

Add tests for department fetch clients and admin page behavior, plus a users page test that verifies department assignment UI and save flow.

**Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm run test:unit -- departments users`
Expected: FAIL because the department fetch layer, hooks, route, or UI are not implemented yet.

**Step 3: Write minimal implementation**

Create the frontend department feature and wire department assignment into the users page.

**Step 4: Run test to verify it passes**

Run: `cd frontend && pnpm run test:unit -- departments users`
Expected: PASS.

### Task 5: Frontend department feature wiring

**Files:**
- Create: `frontend/src/fetch/departments.ts`
- Create: `frontend/src/fetch/user-departments.ts`
- Create: `frontend/src/features/departments/hooks/use-departments.ts`
- Create: `frontend/src/features/departments/hooks/use-department-management.ts`
- Create: `frontend/src/features/departments/pages/DepartmentsPage.tsx`
- Create: `frontend/src/routes/departments.ts`
- Modify: `frontend/src/features/users/pages/UsersPage.tsx`
- Modify: `frontend/src/features/users/hooks/use-user-management.ts`
- Modify: `frontend/src/hooks/index.ts`
- Modify: `frontend/src/fetch/users.ts`
- Modify: `frontend/src/fetch/auth.ts`
- Modify: translation files and route navigation files if the existing app requires them for page discovery

**Step 1: Write the failing test**

Use the frontend tests from Task 4 as the red step.

**Step 2: Run test to verify it fails**

Run the targeted frontend test command and confirm department-related missing behavior is the failure.

**Step 3: Write minimal implementation**

Implement:
- department fetch client and React Query hooks
- departments admin page modeled on tiers or roles
- protected departments route
- department UUID on user types
- department name display in the users table
- department selection and save flow in the user edit modal

**Step 4: Run test to verify it passes**

Run the targeted frontend tests again and confirm they pass.

### Task 6: Full verification

**Files:**
- Modify only if fixes are required after verification

**Step 1: Run backend verification**

Run: `cd backend && uv run pytest tests/test_department.py tests/test_department_service.py tests/test_user.py tests/test_user_service.py -q`
Expected: PASS.

**Step 2: Run frontend verification**

Run: `cd frontend && pnpm run lint`
Expected: PASS.

**Step 3: Run frontend tests**

Run: `cd frontend && pnpm run test:unit -- departments users`
Expected: PASS.

**Step 4: Run frontend build**

Run: `cd frontend && pnpm run build`
Expected: PASS.