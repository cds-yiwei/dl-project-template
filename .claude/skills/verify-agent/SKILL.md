---
name: verify-agent
description: "Use when verifying that implementation matches the spec. Run after APPLY phase and before archiving a change."
argument-hint: "What change needs verification? (defaults to active change)"
user-invocable: true
---

# Verify Agent

Your job is to verify that implementation matches the spec. This is the last gate before archiving — do not skip it.

## Pre-flight

1. Read `delorean/changes/<name>/spec.md` — these are the acceptance criteria
2. Read `delorean/changes/<name>/design.md` — the technical decisions
3. Read `delorean/changes/<name>/tasks.md` — the implementation checklist
4. Identify which files were modified during implementation

## Verification Checklist

Go through each acceptance criterion in spec.md and verify:

### 1. Acceptance Criteria Coverage
For each criterion in `## Acceptance Criteria`:
- [ ] Find the corresponding test(s)
- [ ] Run the test(s) and confirm they pass
- [ ] If no test exists, flag it as missing

### 2. Functional Requirements
For each functional requirement:
- [ ] The described behavior is implemented
- [ ] Edge cases are handled (check spec's edge cases section)
- [ ] Error states match the spec

### 3. Scope Compliance
- [ ] No files outside the "In" scope were modified
- [ ] No items from "Out" were accidentally implemented
- [ ] No unintended side effects on other features

### 4. Code Quality
- [ ] New code follows repository conventions (check backend-developer / frontend-developer skills)
- [ ] No obvious security issues introduced
- [ ] No debug/console.log statements left in production code

### 5. Testing
- [ ] Unit tests for new/modified services
- [ ] API tests for new endpoints
- [ ] E2E tests for user-facing flows
- [ ] All tests pass locally

## Verification Commands for This Repo

```bash
# Backend tests
cd backend && uv run pytest tests/ -v --tb=short

# Lint
cd backend && uv run ruff check src tests
cd frontend && pnpm lint

# Type check
cd backend && uv run mypy src
cd frontend && pnpm typecheck

# E2E (if applicable)
cd frontend && pnpm exec playwright test

# Format check
cd backend && uv run ruff format --check src tests
cd frontend && pnpm format:check
```

## Verification Report Template

For each change, produce this report:

```markdown
# Verification Report: <change-name>

## Summary
VERIFIED / PARTIAL / FAILED

## Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Criterion 1 | ✓ PASS | test_xxx.py::test_yyy passed |
| Criterion 2 | ✗ FAIL | test_zzz missing |
| Criterion 3 | ✓ PASS | Manual verified: behavior confirmed |

## Functional Requirements
- [ADDED] Feature X: VERIFIED
- [MODIFIED] Behavior Y: PARTIAL — edge case Z not handled

## Scope Compliance
✓ All modified files are within scope.
✗ File `foo/bar.py` modified but not in spec scope.

## Test Results
```
<output of test commands>
```

## Issues Found
1. **Missing test**: No test for criterion X
2. **Spec drift**: Implementation diverges from spec in area Y

## Recommendations
- Fix issues before archiving
- Or: Update spec to match implementation (if drift is intentional)
```

## Decision

After verification:
- **All criteria pass**: Run `dl archive <name>` to complete
- **Partial**: Fix issues, then re-verify
- **Failed**: Return to APPLY phase, run `dl phase <name> APPLY`
