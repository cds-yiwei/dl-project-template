#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const LOCK_FILE = join(ROOT, "delorean/harness.lock");
const CHANGES_DIR = join(ROOT, "delorean/changes");

function readJSON(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function getActiveChange(lock) {
  if (lock && lock.active && lock.changes[lock.active]) {
    return { name: lock.active, ...lock.changes[lock.active] };
  }
  return null;
}

function formatPhase(phase, approved) {
  if (phase === "DONE") return "✓ DONE";
  if (phase === "APPLY") return approved ? "✓ APPLY" : "✗ APPLY (not approved)";
  if (approved) return `→ ${phase} (spec approved)`;
  return `→ ${phase}`;
}

function buildContext() {
  const lockFile = existsSync(LOCK_FILE) ? JSON.parse(readFileSync(LOCK_FILE, "utf-8")) : {};
  const activeChange = getActiveChange(lockFile);

  if (!activeChange) {
    return {
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext:
          "[Delorean] No active change. Run `dl init <name>` to create one, " +
          "or `dl status` to see all changes. " +
          "Use `/harness:init <name>` to get started.",
      },
    };
  }

  const changeDir = join(CHANGES_DIR, activeChange.name);
  const statusPath = join(changeDir, "status.json");
  const specPath = join(changeDir, "spec.md");
  const designPath = join(changeDir, "design.md");
  const tasksPath = join(changeDir, "tasks.md");

  let specSummary = "";
  if (existsSync(specPath)) {
    const spec = readFileSync(specPath, "utf-8");
    const criteriaMatch = spec.match(/## Acceptance Criteria\n([\s\S]*?)(?=\n##|$)/);
    if (criteriaMatch) {
      const lines = criteriaMatch[1].trim().split("\n").filter((l) => l.match(/^\s*-\s*\[[xX ]\]/));
      const checked = lines.filter((l) => l.match(/^\s*-\s*\[[xX]\]/)).length;
      const total = lines.length;
      specSummary = total > 0 ? ` (${checked}/${total} criteria done)` : "";
    }
  }

  const scopeFiles = [];
  if (existsSync(specPath)) {
    const spec = readFileSync(specPath, "utf-8");
    const scopeMatch = spec.match(/## Impact\n- Files affected:\s*([\s\S]*?)(?:\n\n|\n##|$)/);
    if (scopeMatch) {
      const lines = scopeMatch[1].trim().split("\n").filter((l) => l.match(/^\s*-\s+/));
      scopeFiles.push(...lines.slice(0, 3).map((l) => l.replace(/^\s*-\s+/, "").trim()));
    }
  }

  let parts = [
    `[Delorean] Active change: **${activeChange.name}**`,
    `Phase: **${formatPhase(activeChange.phase, activeChange.approved)}**`,
  ];

  if (existsSync(specPath)) parts.push("✓ spec.md exists");
  else parts.push("✗ spec.md missing — run `dl spec`");

  if (existsSync(designPath)) parts.push("✓ design.md exists");
  else if (activeChange.phase !== "SPEC") parts.push("○ design.md missing — run `dl design`");

  if (existsSync(tasksPath)) parts.push("✓ tasks.md exists");
  else if (!["SPEC", "DESIGN"].includes(activeChange.phase)) parts.push("○ tasks.md missing");

  if (scopeFiles.length > 0) {
    parts.push(`Scope: ${scopeFiles.join(", ")}${scopeFiles.length === 3 ? "..." : ""}`);
  }

  if (specSummary) parts.push(`Acceptance: ${specSummary}`);

  const phaseGuidance = {
    SPEC: "Write spec.md first, then run `dl approve`.",
    DESIGN: "Write design.md, then run `dl tasks`.",
    TASKS: "Create task checklist, then run `dl apply` to open the gate.",
    APPLY: "Implement and test. Run `dl verify` when done.",
    VERIFY: "Check spec compliance. Run `dl archive` when verified.",
    DONE: "This change is complete.",
  };

  parts.push(`\nTip: ${phaseGuidance[activeChange.phase] || ""}`);
  parts.push("\nCommands: `dl status`, `dl help`, `/harness:status`");

  return {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: parts.join(" | "),
    },
  };
}

try {
  const output = buildContext();
  process.stdout.write(JSON.stringify(output) + "\n");
} catch (err) {
  process.stderr.write(`inject-context error: ${err.message}\n`);
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}
