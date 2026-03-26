#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { join, dirname, isAbsolute } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const LOCK_FILE = join(ROOT, "delorean/harness.lock");

const EDIT_TOOLS = new Set([
  "editFiles",
  "create_file",
  "write_to_file",
  "replace_string_in_file",
  "createNotebook",
]);

function getActiveChange(lock) {
  if (lock && lock.active && lock.changes[lock.active]) {
    return { name: lock.active, ...lock.changes[lock.active] };
  }
  return null;
}

function extractFiles(toolName, toolInput) {
  const files = new Set();
  if (toolName === "editFiles") {
    if (toolInput.files) {
      toolInput.files.forEach((f) => files.add(f));
    }
    if (toolInput.edits) {
      toolInput.edits.forEach((e) => {
        if (e.filePath) files.add(e.filePath);
      });
    }
  } else if (toolName === "create_file" || toolName === "write_to_file") {
    if (toolInput.filePath) files.add(toolInput.filePath);
  } else if (toolInput.path) {
    files.add(toolInput.path);
  } else if (toolInput.filePath) {
    files.add(toolInput.filePath);
  }
  return [...files];
}

function check(input) {
  const toolName = input.tool_name;
  const phase = input.phase;

  if (phase !== "APPLY") {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  if (!EDIT_TOOLS.has(toolName)) {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  const files = extractFiles(toolName, input.tool_input || {});
  const deloreanPath = join(ROOT, "delorean");
  const scriptsPath = join(ROOT, ".github/scripts");

  const implFiles = files.filter((f) => {
    const abs = isAbsolute(f) ? f : join(ROOT, f);
    return !abs.startsWith(deloreanPath) && !abs.startsWith(scriptsPath);
  });

  if (implFiles.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  const relFiles = implFiles.slice(0, 3).map((f) =>
    isAbsolute(f) ? f.replace(ROOT + "/", "") : f
  );
  const extra = implFiles.length > 3 ? ` and ${implFiles.length - 3} more` : "";

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          `[Delorean] ${input.activeChange || "Active change"} in APPLY phase: ` +
          `edited ${relFiles.join(", ")}${extra}. ` +
          `Run \`/harness:verify\` to check spec compliance when ready. ` +
          `Run \`dl verify\` to enter verification phase.`,
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
  process.stderr.write(`post-edit error: ${err.message}\n`);
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}
