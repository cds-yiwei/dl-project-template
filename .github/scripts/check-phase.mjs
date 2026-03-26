#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { join, dirname, isAbsolute } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const LOCK_FILE = join(ROOT, "delorean/harness.lock");
const CHANGES_DIR = join(ROOT, "delorean/changes");

const PHASE_RANKS = {
  SPEC: 0,
  DESIGN: 1,
  TASKS: 2,
  APPLY: 3,
  VERIFY: 4,
  DONE: 5,
};

const TOOL_PHASES = {
  editFiles: "APPLY",
  create_file: "APPLY",
  write_to_file: "APPLY",
  replace_string_in_file: "APPLY",
  rename_file: "APPLY",
  delete_file: "APPLY",
  move_file: "APPLY",
  runTerminalCommand: "APPLY",
  bash: "APPLY",
  createNotebook: "APPLY",
};

function getActiveChange(lock) {
  if (lock && lock.active && lock.changes[lock.active]) {
    return { name: lock.active, ...lock.changes[lock.active] };
  }
  return null;
}

function getChangeDir(name) {
  return join(CHANGES_DIR, name);
}

function getPhaseForTool(toolName) {
  return TOOL_PHASES[toolName] || null;
}

function canEditFile(filePath, changeName, toolName) {
  if (!filePath) return true;

  const deloreanPath = join(ROOT, "delorean");
  const normalizedPath = isAbsolute(filePath) ? filePath : join(ROOT, filePath);

  if (normalizedPath.startsWith(deloreanPath)) {
    return true;
  }

  const scriptsPath = join(ROOT, ".github/scripts");
  if (normalizedPath.startsWith(scriptsPath)) {
    return true;
  }

  if (toolName === "runTerminalCommand" || toolName === "bash") {
    const cmd = (filePath.command || filePath).toLowerCase();
    if (cmd.includes("delorean") || cmd.includes(" dl ") || cmd.includes("dl ")) {
      return true;
    }
  }

  return false;
}

function check(input) {
  const toolName = input.tool_name;
  const toolInput = input.tool_input || {};
  const phase = input.phase;

  if (!phase) {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  const requiredPhase = getPhaseForTool(toolName);

  if (!requiredPhase) {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  const requiredRank = PHASE_RANKS[requiredPhase] ?? 0;
  const currentRank = PHASE_RANKS[phase] ?? 0;

  if (currentRank >= requiredRank) {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  const filePath = toolInput.filePath || toolInput.path || toolInput.files?.[0] || null;
  if (canEditFile(filePath, null, toolName)) {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  const phaseMessages = {
    SPEC: "SPEC phase: Only delorean spec/design/tasks files can be edited.",
    DESIGN: "DESIGN phase: Only delorean files can be edited.",
    TASKS: "TASKS phase: Only delorean files can be edited.",
  };

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        permissionDecision: "deny",
        permissionDecisionReason: `[Delorean] Cannot use "${toolName}" in ${phase} phase. ` +
          (phaseMessages[phase] || "Approve the spec first with `dl approve` or switch to APPLY phase."),
      },
    }) + "\n"
  );
}

try {
  const input = JSON.parse(readFileSync("/dev/stdin", "utf-8"));
  const lockFile = existsSync(LOCK_FILE) ? JSON.parse(readFileSync(LOCK_FILE, "utf-8")) : {};
  const activeChange = getActiveChange(lockFile);

  const enrichedInput = {
    ...input,
    phase: activeChange ? activeChange.phase : null,
    activeChange: activeChange ? activeChange.name : null,
  };

  check(enrichedInput);
} catch (err) {
  process.stderr.write(`check-phase error: ${err.message}\n`);
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}
