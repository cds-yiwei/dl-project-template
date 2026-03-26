#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, rmSync, cpSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const DELOREAN = join(ROOT, "delorean");
const CHANGES = join(DELOREAN, "changes");
const ARCHIVE = join(DELOREAN, "archive");
const LOCK_FILE = join(DELOREAN, "harness.lock");

const PHASES = ["SPEC", "DESIGN", "TASKS", "APPLY", "VERIFY", "DONE"];

function readJSON(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJSON(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

function readLock() {
  if (existsSync(LOCK_FILE)) {
    return readJSON(LOCK_FILE);
  }
  return { active: null, changes: {} };
}

function writeLock(lock) {
  writeJSON(LOCK_FILE, lock);
}

function getChangeStatus(name) {
  const statusPath = join(CHANGES, name, "status.json");
  if (existsSync(statusPath)) {
    return readJSON(statusPath);
  }
  return null;
}

function listChanges(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => {
    try {
      return statSync(join(dir, n)).isDirectory();
    } catch {
      return false;
    }
  });
}

function cmdInit(name, description) {
  if (!name) {
    console.error("Usage: dl init <name> [description]");
    process.exit(1);
  }
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const changeDir = join(CHANGES, slug);
  if (existsSync(changeDir)) {
    console.error(`Change "${slug}" already exists.`);
    process.exit(1);
  }

  mkdirSync(changeDir, { recursive: true });
  const status = {
    name: slug,
    description: description || name,
    phase: "SPEC",
    approved: false,
    specMeta: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeJSON(join(changeDir, "status.json"), status);

  const lock = readLock();
  lock.active = slug;
  lock.changes[slug] = { phase: "SPEC", approved: false };
  writeLock(lock);

  console.log(`✓ Change "${slug}" created and set as active.`);
  console.log(`  Phase: SPEC | Approved: false`);
  console.log(`  Run "dl spec ${slug}" to write the spec.`);
}

function cmdSpec(name, options = {}) {
  const lock = readLock();
  const active = name || lock.active;
  if (!active) {
    console.error("No active change. Run `dl init <name>` first or pass a change name.");
    process.exit(1);
  }
  const changeDir = join(CHANGES, active);
  if (!existsSync(changeDir)) {
    console.error(`Change "${active}" not found.`);
    process.exit(1);
  }

  const specPath = join(changeDir, "spec.md");
  if (existsSync(specPath) && !options.overwrite) {
    console.log(`spec.md already exists for "${active}". Use --overwrite to replace.`);
  } else {
    const specContent = `# Spec: ${active}

## Overview
<!-- What problem does this change solve? Why is it needed? -->

## Functional Requirements
<!-- What must the system do? Use GIVEN/WHEN/THEN for each scenario. -->

## Non-Functional Requirements
<!-- Performance, security, observability constraints -->

## Scope
### In
<!-- What's included -->

### Out
<!-- What's explicitly NOT included -->

## Acceptance Criteria
<!-- How do we know it's done? Each criterion should be testable. -->
- [ ]

## Impact
- Files affected: <!-- list files or directories -->
- Services affected: <!-- list services -->
`;
    writeFileSync(specPath, specContent);
    const status = getChangeStatus(active);
    if (status) {
      status.updatedAt = new Date().toISOString();
      writeJSON(join(changeDir, "status.json"), status);
    }
    console.log(`✓ spec.md created for "${active}".`);
    console.log(`  Edit the file and run "dl approve ${active}" when ready.`);
  }
}

function cmdDesign(name) {
  const lock = readLock();
  const active = name || lock.active;
  if (!active) {
    console.error("No active change. Run `dl init <name>` first or pass a change name.");
    process.exit(1);
  }
  const changeDir = join(CHANGES, active);
  const designPath = join(changeDir, "design.md");
  if (existsSync(designPath)) {
    console.log(`design.md already exists for "${active}".`);
  } else {
    const designContent = `# Design: ${active}

## Architecture
<!-- High-level design decisions -->

## API Design
<!-- If API changes: endpoints, request/response shapes -->

## Data Model
<!-- Database schema changes, new models -->

## Sequence Diagrams
<!-- Key interaction flows -->

## Dependencies
<!-- External services, libraries, other changes -->

## Risks & Mitigations
<!-- What could go wrong? -->
`;
    writeFileSync(designPath, designContent);
    const status = getChangeStatus(active);
    if (status) {
      status.updatedAt = new Date().toISOString();
      writeJSON(join(changeDir, "status.json"), status);
    }
    console.log(`✓ design.md created for "${active}".`);
  }
}

function cmdTasks(name) {
  const lock = readLock();
  const active = name || lock.active;
  if (!active) {
    console.error("No active change. Run `dl init <name>` first or pass a change name.");
    process.exit(1);
  }
  const changeDir = join(CHANGES, active);
  const tasksPath = join(changeDir, "tasks.md");
  if (existsSync(tasksPath)) {
    console.log(`tasks.md already exists for "${active}".`);
  } else {
    const specPath = join(changeDir, "spec.md");
    let specSummary = "";
    if (existsSync(specPath)) {
      const spec = readFileSync(specPath, "utf-8");
      const match = spec.match(/## Scope\n### In\n([\s\S]*?)(?:### Out|$)/);
      if (match) {
        const inScope = match[1].trim().split("\n").filter((l) => l.startsWith("-"));
        specSummary = inScope.map((l) => `- [ ] ${l.replace(/^-\s*/, "")}`).join("\n");
      }
    }
    const tasksContent = `# Tasks: ${active}

## Implementation Checklist
${specSummary || "<!-- Break down from spec.md acceptance criteria -->"}

## Backend Tasks
<!-- SQLAlchemy models, schemas, CRUD, services, routes, migrations -->
- [ ]

## Frontend Tasks
<!-- Components, pages, API integration, state -->
- [ ]

## Testing Tasks
- [ ] Unit tests for new/modified services
- [ ] API integration tests
- [ ] E2E tests if applicable

## DevOps Tasks
<!-- Migrations, environment config, deployment -->
- [ ]
`;
    writeFileSync(tasksPath, tasksContent);
    const status = getChangeStatus(active);
    if (status) {
      status.updatedAt = new Date().toISOString();
      writeJSON(join(changeDir, "status.json"), status);
    }
    console.log(`✓ tasks.md created for "${active}".`);
  }
}

function cmdApprove(name) {
  const lock = readLock();
  const active = name || lock.active;
  if (!active) {
    console.error("No active change. Run `dl init <name>` first or pass a change name.");
    process.exit(1);
  }
  const statusPath = join(CHANGES, active, "status.json");
  if (!existsSync(statusPath)) {
    console.error(`Change "${active}" not found.`);
    process.exit(1);
  }
  const status = readJSON(statusPath);
  status.approved = true;
  status.phase = "DESIGN";
  status.approvedAt = new Date().toISOString();
  status.updatedAt = new Date().toISOString();
  writeJSON(statusPath, status);

  lock.changes[active] = { phase: "DESIGN", approved: true };
  writeLock(lock);

  console.log(`✓ "${active}" approved. Phase: DESIGN`);
  console.log(`  Run "dl design ${active}" then "dl tasks ${active}" to continue.`);
}

function cmdSetPhase(name, phase) {
  if (!phase || !PHASES.includes(phase)) {
    console.error(`Usage: dl phase <name> <${PHASES.join("|")}>`);
    process.exit(1);
  }
  const lock = readLock();
  const active = name || lock.active;
  if (!active) {
    console.error("No active change.");
    process.exit(1);
  }
  const statusPath = join(CHANGES, active, "status.json");
  if (!existsSync(statusPath)) {
    console.error(`Change "${active}" not found.`);
    process.exit(1);
  }
  const status = readJSON(statusPath);
  status.phase = phase;
  status.updatedAt = new Date().toISOString();
  writeJSON(statusPath, status);

  lock.changes[active] = { phase, approved: status.approved };
  writeLock(lock);

  console.log(`✓ "${active}" phase set to ${phase}.`);
}

function cmdApply(name) {
  const lock = readLock();
  const active = name || lock.active;
  if (!active) {
    console.error("No active change.");
    process.exit(1);
  }
  const statusPath = join(CHANGES, active, "status.json");
  if (!existsSync(statusPath)) {
    console.error(`Change "${active}" not found.`);
    process.exit(1);
  }
  const status = readJSON(statusPath);
  if (!status.approved) {
    console.error(`"${active}" spec not yet approved. Run "dl approve ${active}" first.`);
    process.exit(1);
  }
  status.phase = "APPLY";
  status.updatedAt = new Date().toISOString();
  writeJSON(statusPath, status);

  lock.changes[active] = { phase: "APPLY", approved: true };
  lock.active = active;
  writeLock(lock);

  console.log(`✓ "${active}" entered APPLY phase.`);
  console.log(`  Gate is open. Work through tasks.md checklist and edit implementation files.`);
  console.log(`  Run "dl verify ${active}" when all tasks are checked off.`);
}

function cmdVerify(name) {
  const lock = readLock();
  const active = name || lock.active;
  if (!active) {
    console.error("No active change.");
    process.exit(1);
  }
  const changeDir = join(CHANGES, active);
  const statusPath = join(changeDir, "status.json");
  if (!existsSync(statusPath)) {
    console.error(`Change "${active}" not found.`);
    process.exit(1);
  }
  const status = readJSON(statusPath);
  status.phase = "VERIFY";
  status.updatedAt = new Date().toISOString();
  writeJSON(statusPath, status);

  lock.changes[active] = { phase: "VERIFY", approved: status.approved };
  writeLock(lock);

  console.log(`✓ "${active}" entered VERIFY phase.`);
  console.log(`  Check implementation against spec.md acceptance criteria.`);
  console.log(`  Run tests: cd backend && uv run pytest`);
  console.log(`  When verified, run "dl archive ${active}" to complete.`);
}

function cmdStatus() {
  const lock = readLock();
  console.log("\n=== Delorean Harness Status ===\n");
  if (!lock.active) {
    console.log("No active change.");
  } else {
    console.log(`Active change: ${lock.active}`);
  }
  console.log("\nAll changes:");
  const allChanges = [
    ...listChanges(CHANGES).map((n) => ({ name: n, dir: CHANGES })),
    ...listChanges(ARCHIVE).map((n) => ({ name: n, dir: ARCHIVE })),
  ];
  if (allChanges.length === 0) {
    console.log("  No changes found. Run `dl init <name>` to start.");
  } else {
    for (const { name, dir } of allChanges) {
      const statusPath = join(dir, name, "status.json");
      const isArchive = dir === ARCHIVE;
      if (existsSync(statusPath)) {
        const s = readJSON(statusPath);
        const approved = s.approved ? "✓" : "✗";
        const marker = isArchive ? "[ARCHIVED]" : lock.active === name ? "→" : " ";
        console.log(
          `  ${marker} ${name.padEnd(30)} ${s.phase.padEnd(12)} approved: ${approved}`
        );
      } else {
        console.log(`  ${name} (no status.json)`);
      }
    }
  }
  console.log("");
}

function cmdCurrent() {
  const lock = readLock();
  if (lock.active) {
    console.log(lock.active);
  }
}

function cmdActivate(name) {
  const lock = readLock();
  const active = name || lock.active;
  if (!active) {
    console.error("No change name provided.");
    process.exit(1);
  }
  const changeDir = join(CHANGES, active);
  if (!existsSync(changeDir)) {
    console.error(`Change "${active}" not found.`);
    process.exit(1);
  }
  lock.active = active;
  writeLock(lock);
  console.log(`✓ "${active}" is now the active change.`);
}

function cmdArchive(name) {
  const lock = readLock();
  const active = name || lock.active;
  if (!active) {
    console.error("No active change.");
    process.exit(1);
  }
  const src = join(CHANGES, active);
  const dst = join(ARCHIVE, active);
  if (!existsSync(src)) {
    console.error(`Change "${active}" not found.`);
    process.exit(1);
  }
  if (existsSync(dst)) {
    rmSync(dst, { recursive: true });
  }
  mkdirSync(ARCHIVE, { recursive: true });

  const statusPath = join(src, "status.json");
  if (existsSync(statusPath)) {
    const status = readJSON(statusPath);
    status.phase = "DONE";
    status.archivedAt = new Date().toISOString();
    status.updatedAt = new Date().toISOString();
    writeJSON(statusPath, status);
  }

  cpSync(src, dst, { recursive: true });
  rmSync(src, { recursive: true });

  if (lock.active === active) {
    lock.active = null;
  }
  delete lock.changes[active];
  writeLock(lock);

  console.log(`✓ "${active}" archived.`);
}

function cmdHelp() {
  console.log(`
Delorean Agent Harness CLI

Usage: dl <command> [options]

Change Management:
  dl init <name> [description]  Create and activate a new change
  dl activate <name>            Set active change (or use dl current)
  dl status                    Show all changes and phases
  dl current                   Print active change name

Workflow (in order):
  dl spec [name]               Create/update spec.md
  dl design [name]             Create/update design.md
  dl tasks [name]              Create/update tasks.md
  dl approve [name]            Approve spec → phase: DESIGN
  dl apply [name]             Enter APPLY phase (work through tasks.md)
  dl verify [name]             Enter VERIFY phase
  dl archive [name]            Archive → DONE, move to archive/

Manual Phase Control:
  dl phase [name] <PHASE>      Set phase directly (SPEC|DESIGN|TASKS|APPLY|VERIFY|DONE)

Run "dl <command> --help" for per-command options.
`);
}

const cmds = {
  init: (args) => cmdInit(args[0], args[1]),
  spec: (args) => cmdSpec(args[0], { overwrite: args.includes("--overwrite") }),
  design: (args) => cmdDesign(args[0]),
  tasks: (args) => cmdTasks(args[0]),
  approve: (args) => cmdApprove(args[0]),
  phase: (args) => cmdSetPhase(args[0], args[1]),
  apply: (args) => cmdApply(args[0]),
  verify: (args) => cmdVerify(args[0]),
  status: () => cmdStatus(),
  current: () => cmdCurrent(),
  activate: (args) => cmdActivate(args[0]),
  archive: (args) => cmdArchive(args[0]),
  help: () => cmdHelp(),
};

const cmd = process.argv[2];
const rest = process.argv.slice(3).filter((a) => !a.startsWith("--"));

if (!cmd || cmd === "help" || cmds[cmd] === undefined) {
  cmdHelp();
  process.exit(cmd === undefined ? 0 : 1);
}

try {
  cmds[cmd](rest);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
