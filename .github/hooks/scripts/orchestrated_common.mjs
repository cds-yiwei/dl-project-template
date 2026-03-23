import fs from 'node:fs/promises';
import path from 'node:path';

export const STATE_DIRNAME = 'copilot-hook-state';
export const STATE_FILENAME = 'orchestrated-agent-state.json';
export const SESSION_LOG_FILENAME = 'orchestrated-agent-sessions.jsonl';

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function utcNowIso() {
  return new Date().toISOString();
}

async function readStdin() {
  let result = '';
  process.stdin.setEncoding('utf8');

  for await (const chunk of process.stdin) {
    result += chunk;
  }

  return result;
}

export async function loadHookInput() {
  try {
    const raw = await readStdin();
    if (!raw.trim()) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function repoRootFromInput(inputData) {
  const { cwd } = inputData;
  return typeof cwd === 'string' && cwd.length > 0 ? cwd : process.cwd();
}

export function stateDir(repoRoot) {
  return path.join(repoRoot, '.git', STATE_DIRNAME);
}

export function statePath(repoRoot) {
  return path.join(stateDir(repoRoot), STATE_FILENAME);
}

export function sessionLogPath(repoRoot) {
  return path.join(stateDir(repoRoot), SESSION_LOG_FILENAME);
}

export function defaultState() {
  return {
    lastTaskTimestamp: null,
    cooldownMs: 5000,
    stopSignal: false,
    preferences: {
      verbosity: 'normal',
      preferredSkill: null,
    },
    skillScores: [],
    conversationState: 'idle',
    activeTaskName: null,
    toolAudit: [],
    lastUpdated: utcNowIso(),
  };
}

export async function loadState(repoRoot) {
  const filePath = statePath(repoRoot);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return defaultState();
    }

    const merged = defaultState();
    Object.assign(merged, parsed);

    if (isRecord(parsed.preferences)) {
      merged.preferences = {
        ...merged.preferences,
        verbosity:
          typeof parsed.preferences.verbosity === 'string'
            ? parsed.preferences.verbosity
            : merged.preferences.verbosity,
        preferredSkill:
          typeof parsed.preferences.preferredSkill === 'string' || parsed.preferences.preferredSkill === null
            ? parsed.preferences.preferredSkill
            : merged.preferences.preferredSkill,
      };
    }

    return merged;
  } catch {
    process.stderr.write(`Warning: failed to load hook state from ${filePath}, using defaults.\n`);
    return defaultState();
  }
}

export async function saveState(repoRoot, state) {
  const directory = stateDir(repoRoot);
  await fs.mkdir(directory, { recursive: true });
  state.lastUpdated = utcNowIso();
  await fs.writeFile(statePath(repoRoot), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export async function appendSessionLog(repoRoot, entry) {
  const directory = stateDir(repoRoot);
  await fs.mkdir(directory, { recursive: true });
  await fs.appendFile(sessionLogPath(repoRoot), `${JSON.stringify(entry)}\n`, 'utf8');
}

export function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  return 0;
}

export function truncateText(value, limit = 140) {
  const compact = value.trim().split(/\s+/).join(' ');
  if (compact.length <= limit) {
    return compact;
  }

  return `${compact.slice(0, Math.max(limit - 3, 0))}...`;
}

export function isStopRequest(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === 'stop:';
}

export async function runCli(main) {
  try {
    process.exitCode = await main();
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}