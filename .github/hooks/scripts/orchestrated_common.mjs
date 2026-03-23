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
    autoSkillHint: null,
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

const BACKEND_KEYWORDS = [
  ' backend',
  'backend/',
  'backend/src/',
  'backend/tests/',
  'fastapi',
  'sqlalchemy',
  'alembic',
  'casbin',
  'casbin_guard',
  'authlib',
  'oidc',
  'redis',
  'migration',
  'migrations',
  'schema',
  'schemas',
  'service',
  'services',
  'crud',
  'fastcrud',
  'asyncsession',
  'access_policy',
  'policy_service',
  'role_service',
  'tier_service',
  'post_service',
  'api/v1',
  '.py',
  'src/app',
  'src/migrations',
];

const FRONTEND_KEYWORDS = [
  ' frontend',
  'frontend/',
  'frontend/src/',
  'frontend/tests/',
  'frontend/e2e/',
  'react',
  'vite',
  'tanstack',
  'react query',
  'zustand',
  'playwright',
  'vitest',
  'tailwind',
  'gcds',
  'gcds-core',
  'component',
  'components',
  'page',
  'pages',
  'route',
  'routes',
  'routetree',
  'route tree',
  'auth-routing',
  'request-json',
  'requestjson',
  'querykey',
  'storybook',
  '.tsx',
  '.ts',
  'src/routes',
  'src/features',
  'src/components',
  'src/store',
  'src/fetch',
];

const FULL_STACK_KEYWORDS = [
  'full stack',
  'full-stack',
  'end to end',
  'end-to-end',
  'frontend and backend',
  'backend and frontend',
  'ui and api',
  'api and ui',
  'integration',
  'monorepo',
];

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function mentionsRepoPathPair(text) {
  return text.includes('backend/') && text.includes('frontend/');
}

export function detectRepoSkillHint(prompt) {
  const normalized = ` ${String(prompt ?? '').trim().toLowerCase()} `;
  if (!normalized.trim()) {
    return null;
  }

  const mentionsBothRepoPaths = mentionsRepoPathPair(normalized);
  const wantsBoth = includesAny(normalized, FULL_STACK_KEYWORDS);
  const mentionsBackend = includesAny(normalized, BACKEND_KEYWORDS);
  const mentionsFrontend = includesAny(normalized, FRONTEND_KEYWORDS);

  if (mentionsBothRepoPaths || wantsBoth || (mentionsBackend && mentionsFrontend)) {
    const instructionPrefix = mentionsBothRepoPaths
      ? 'This prompt explicitly mentions both backend/ and frontend/ paths. Treat it as coordinated full-stack repo work. '
      : '';

    return {
      key: 'full-stack',
      label: 'backend-developer + frontend-developer',
      instruction:
        instructionPrefix +
        "For this repo, load both local skills 'backend-developer' and 'frontend-developer'. " +
        'Evaluate whether the request needs backend changes, frontend changes, or coordinated updates on both sides, then keep each side aligned with its existing structure and coding style.',
    };
  }

  if (mentionsBackend) {
    return {
      key: 'backend-developer',
      label: 'backend-developer',
      instruction:
        "For this repo, load and follow the local 'backend-developer' skill before substantive work. " +
        'Keep FastAPI layering, services, schemas, migrations, Casbin policies, and backend tests aligned with the repo standard.',
    };
  }

  if (mentionsFrontend) {
    return {
      key: 'frontend-developer',
      label: 'frontend-developer',
      instruction:
        "For this repo, load and follow the local 'frontend-developer' skill before substantive work. " +
        'Keep TanStack Router, feature folders, fetch and auth-routing, shared UI wrappers, and frontend tests aligned with the repo standard.',
    };
  }

  return null;
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