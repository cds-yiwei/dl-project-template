---
name: harness-manager
description: "Use to manage Delorean harness workflow: init, status, approve, phase transitions, archive. Run whenever you need to create a change, check state, or transition phases."
argument-hint: "What do you want to do? (init, status, approve, apply, verify, archive, or just ask about the current state)"
user-invocable: true
---

# Harness Manager

Use the Delorean harness CLI (`node .github/scripts/cli.mjs` or `dl`) to manage the spec-driven development workflow.

## Available Commands

### `/harness:init <name> [description]`
Create and activate a new change. This scaffolds `delorean/changes/<name>/` with `status.json`.

**Usage**: Tell me the change name and a one-line description, then run:
```
node .github/scripts/cli.mjs init <name> <description>
```

Then use `/harness:spec` to write the spec.

### `/harness:spec [name]`
Create or update the spec.md for the active change. Run this command, then I will guide you through writing a structured spec.

**Usage**: Run:
```
node .github/scripts/cli.mjs spec [name]
```
Then open the generated `delorean/changes/<name>/spec.md` and fill it in.

### `/harness:design [name]`
Scaffold design.md for the active change. Should be run after spec is approved.

**Usage**: Run:
```
node .github/scripts/cli.mjs design [name]
```

### `/harness:tasks [name]`
Scaffold tasks.md for the active change, auto-populated from spec scope.

**Usage**: Run:
```
node .github/scripts/cli.mjs tasks [name]
```

### `/harness:approve [name]`
Approve the spec and advance from SPEC to DESIGN phase. Only do this after reviewing the spec.md and confirming it captures:
- What problem is solved
- Functional requirements with acceptance criteria
- Explicit scope (what's in and out)
- Non-functional constraints

**Usage**: Run:
```
node .github/scripts/cli.mjs approve [name]
```

### `/harness:apply [name]`
Enter the APPLY phase. This opens the gate — edit tools become allowed. Work through the tasks.md checklist. **Only run after**:
1. spec.md is written and approved
2. design.md is written
3. tasks.md has the implementation checklist

**Usage**: Run:
```
node .github/scripts/cli.mjs apply [name]
```

### `/harness:verify [name]`
Enter the VERIFY phase. Compare implementation against spec acceptance criteria.

**Usage**: Run:
```
node .github/scripts/cli.mjs verify [name]
```
Then use the `verify-agent` skill to do a structured verification pass.

### `/harness:archive [name]`
Archive the change. Moves it from `delorean/changes/` to `delorean/archive/`. Only archive after all acceptance criteria are met and tests pass.

**Usage**: Run:
```
node .github/scripts/cli.mjs archive [name]
```

### `/harness:status`
Show all changes and their current phases.

**Usage**: Run:
```
node .github/scripts/cli.mjs status
```

## Workflow Cheat Sheet

```
Start:     dl init <name> && dl spec <name> && dl approve <name>
Design:    dl design <name> && dl tasks <name>
Apply:     dl apply <name>   ← gate opens here, work through tasks.md
Verify:    dl verify <name>
Complete:  dl archive <name>
```

## Phase Transition Rules

- **SPEC → DESIGN**: Only via `dl approve` (requires spec.md)
- **DESIGN → TASKS**: Via `dl tasks` (auto) or manual phase
- **TASKS → APPLY**: Only via `dl apply` (requires approved spec)
- **APPLY → VERIFY**: Via `dl verify`
- **VERIFY → DONE**: Via `dl archive`

All transitions are reversible (you can go back) except DONE/archive.
