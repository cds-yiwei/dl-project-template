---
name: spec-crafter
description: "Use when writing or significantly updating a spec.md for a Delorean change. The spec is the source of truth — get it right before implementing."
argument-hint: "Describe the change or what aspect of the spec needs work."
user-invocable: true
---

# Spec Crafter

Your job is to produce a high-quality `spec.md` for the active Delorean change. The spec is the contract between what is needed and what will be built — imprecise specs lead to scope creep, missed requirements, and implementation drift.

## Before Writing

1. Confirm the change name: read `delorean/harness.lock` or run `node .github/scripts/cli.mjs current`
2. Understand the existing codebase in the relevant area (backend and/or frontend)
3. If this is a brownfield change (modifying existing behavior), read the existing implementation first

## Spec Template

Use this structure for every spec.md:

```markdown
# Spec: <change-name>

## Overview
<!-- 2-3 sentences: What problem does this solve? Why now? -->

## Functional Requirements
<!-- Numbered list of capabilities. Each should be independently testable. -->
<!-- Use GIVEN/WHEN/THEN for complex behaviors: -->
1. GIVEN <precondition>
   WHEN <action>
   THEN <observable result>

## Non-Functional Requirements
<!-- Constraints on performance, security, observability, availability -->

## Scope
### In
<!-- What's included. Be specific. -->
- Backend: <affected modules/files>
- Frontend: <affected components/pages>
- API: <endpoints affected>

### Out
<!-- Explicitly excluded. Prevents scope creep. -->
- Feature X (reason)
- Support for Y (reason)

## Acceptance Criteria
<!-- Each criterion is a testable statement. -->
- [ ] <Criterion 1>
- [ ] <Criterion 2>

## Impact
- Files affected: <list>
- Services affected: <list>
- New dependencies: <list or "none">
```

## Brownfield: Delta Markers

For changes to existing features, mark sections with delta markers:

- **ADDED**: New functionality not previously present
- **MODIFIED**: Existing behavior that changes
- **REMOVED**: Functionality being deleted

Example:
```markdown
## Functional Requirements

### ADDED: Dark Mode Toggle
...

### MODIFIED: Theme Loading
Previously themes were loaded at build time. Now:
GIVEN a user preference is stored
WHEN the app loads
THEN the saved preference is applied without flash
```

## Common Mistakes to Avoid

| Mistake | Fix |
|---------|-----|
| Vague requirements ("should be fast") | Specific: "<200ms p95 for list endpoint" |
| Scope too broad | Explicit "Out" section, constrained by acceptance criteria |
| No acceptance criteria | At least one criterion per functional requirement |
| Implementation details in spec | Spec says WHAT, design says HOW |
| Forgetting edge cases | Add a "Edge Cases" subsection under functional requirements |
| Missing error behavior | Explicitly state how errors are reported to user |

## After Writing

1. Review spec against the user's original intent
2. Confirm all acceptance criteria are independently testable
3. Flag any items that need design decisions (defer to design.md)
4. Inform the user the spec is ready for approval with `dl approve <name>`

## Key Principle

> A spec is a promise. Write it so that any developer on the team could implement it without asking questions.
