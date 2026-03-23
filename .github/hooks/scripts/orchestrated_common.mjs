import fs from 'node:fs/promises';
import path from 'node:path';

export const RUNTIME_DIRNAME = path.join('.github', 'hooks', 'runtime');
export const SPECS_DIRNAME = path.join('docs', 'specs');
export const CURRENT_SPECS_DIRNAME = 'current';
export const ARCHIVED_SPECS_DIRNAME = 'archive';
export const SPEC_SCHEMA_FILENAME = 'spec.schema.json';
export const STATE_FILENAME = 'orchestrated-agent-state.json';
export const SESSION_STATE_FILENAME = 'orchestrated-agent-session.json';
export const SESSION_LOG_FILENAME = 'orchestrated-agent-sessions.jsonl';
export const SPEC_FILENAME = 'spec.json';

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

export function runtimeDir(repoRoot) {
  return path.join(repoRoot, RUNTIME_DIRNAME);
}

export function statePath(repoRoot) {
  return path.join(runtimeDir(repoRoot), STATE_FILENAME);
}

export function sessionStatePath(repoRoot) {
  return path.join(runtimeDir(repoRoot), SESSION_STATE_FILENAME);
}

export function sessionLogPath(repoRoot) {
  return path.join(runtimeDir(repoRoot), SESSION_LOG_FILENAME);
}

export function specsDir(repoRoot) {
  return path.join(repoRoot, SPECS_DIRNAME);
}

export function currentSpecsDir(repoRoot) {
  return path.join(specsDir(repoRoot), CURRENT_SPECS_DIRNAME);
}

export function archivedSpecsDir(repoRoot) {
  return path.join(specsDir(repoRoot), ARCHIVED_SPECS_DIRNAME);
}

function absoluteRepoPath(repoRoot, repoRelativePath) {
  return path.join(repoRoot, ...repoRelativePath.split('/'));
}

export function relativeRepoPath(repoRoot, absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
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
    currentSpecFolderPath: null,
    currentSpecPath: null,
    currentTaskListPath: null,
    toolAudit: [],
    lastUpdated: utcNowIso(),
  };
}

export function defaultSessionState() {
  return {
    status: 'idle',
    sessionStartedAt: utcNowIso(),
    activeTaskName: null,
    currentSpecFolderPath: null,
    currentSpecPath: null,
    currentTaskListPath: null,
    lastArchivedSpecPath: null,
    tasks: [],
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

export async function loadSessionState(repoRoot) {
  const filePath = sessionStatePath(repoRoot);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return defaultSessionState();
    }

    return {
      ...defaultSessionState(),
      ...parsed,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    };
  } catch {
    return defaultSessionState();
  }
}

export async function saveState(repoRoot, state) {
  const directory = runtimeDir(repoRoot);
  await fs.mkdir(directory, { recursive: true });
  state.lastUpdated = utcNowIso();
  await fs.writeFile(statePath(repoRoot), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export async function saveSessionState(repoRoot, sessionState) {
  const directory = runtimeDir(repoRoot);
  await fs.mkdir(directory, { recursive: true });
  sessionState.lastUpdated = utcNowIso();
  await fs.writeFile(sessionStatePath(repoRoot), `${JSON.stringify(sessionState, null, 2)}\n`, 'utf8');
}

export async function appendSessionLog(repoRoot, entry) {
  const directory = runtimeDir(repoRoot);
  await fs.mkdir(directory, { recursive: true });
  await fs.appendFile(sessionLogPath(repoRoot), `${JSON.stringify(entry)}\n`, 'utf8');
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'task';
}

function filenameTimestamp() {
  return utcNowIso().toLowerCase().replace(/[:.]/g, '-');
}

function createDefaultTasks() {
  return [
    { id: 'brainstorm-spec', title: 'Brainstorm and clarify spec', status: 'in_progress' },
    { id: 'execute-work', title: 'Execute planned work', status: 'not_started' },
    { id: 'verify-work', title: 'Verify completed work', status: 'not_started' },
    { id: 'archive-artifacts', title: 'Archive session artifacts', status: 'not_started' },
  ];
}

function createDefaultSpec(taskName) {
  return {
    $schema: '../../spec.schema.json',
    schemaVersion: 1,
    task: taskName,
    status: 'drafting',
    createdAt: utcNowIso(),
    updatedAt: utcNowIso(),
    goal: taskName,
    brainstorming: [
      'What is the smallest useful outcome for this task?',
      'What constraints or repo conventions should shape the implementation?',
      'What would make this change clearly complete?',
    ],
    openQuestions: ['Add any unclear requirements here before editing code.'],
    constraints: ['Keep changes aligned with the existing repo structure and hook contracts.'],
    successCriteria: [
      'The task goal is clear enough to execute without hidden assumptions.',
      'Any unresolved questions are explicit before file edits or commands run.',
    ],
    clarifications: [],
    sessionUpdates: [],
    notes: [],
    tasks: createDefaultTasks(),
  };
}

async function loadSpecFile(repoRoot, specPath) {
  const filePath = absoluteRepoPath(repoRoot, specPath);
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function saveSpecFile(repoRoot, specPath, spec) {
  const filePath = absoluteRepoPath(repoRoot, specPath);
  spec.updatedAt = utcNowIso();
  await fs.writeFile(filePath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
}

export async function createActiveSpecBundle(repoRoot, taskName) {
  await fs.mkdir(currentSpecsDir(repoRoot), { recursive: true });

  const folderName = slugify(taskName);
  const folderPath = path.join(currentSpecsDir(repoRoot), folderName);
  await fs.rm(folderPath, { recursive: true, force: true });
  await fs.mkdir(folderPath, { recursive: true });

  const specFilePath = path.join(folderPath, SPEC_FILENAME);
  const relativeFolderPath = relativeRepoPath(repoRoot, folderPath);
  const relativeSpecPath = relativeRepoPath(repoRoot, specFilePath);
  const spec = createDefaultSpec(taskName);

  await saveSpecFile(repoRoot, relativeSpecPath, spec);

  return {
    folderPath: relativeFolderPath,
    specPath: relativeSpecPath,
    taskListPath: null,
    tasks: spec.tasks,
  };
}

export async function syncSessionTasksFromSpec(repoRoot, state, sessionState) {
  if (!state.currentSpecPath) {
    sessionState.tasks = [];
    return null;
  }

  const spec = await loadSpecFile(repoRoot, state.currentSpecPath);
  sessionState.tasks = Array.isArray(spec.tasks) ? spec.tasks : [];
  return spec;
}

export async function appendToActiveSpec(repoRoot, specPath, fieldName, text) {
  if (!specPath) {
    return;
  }

  const spec = await loadSpecFile(repoRoot, specPath);
  if (!Array.isArray(spec[fieldName])) {
    spec[fieldName] = [];
  }

  spec[fieldName].push({
    timestamp: utcNowIso(),
    text,
  });

  await saveSpecFile(repoRoot, specPath, spec);
}

export async function archiveCurrentSpecBundle(repoRoot, state, sessionState) {
  if (!state.currentSpecFolderPath) {
    return null;
  }

  const currentFolderPath = absoluteRepoPath(repoRoot, state.currentSpecFolderPath);

  try {
    await fs.access(currentFolderPath);
  } catch {
    return null;
  }

  await syncSessionTasksFromSpec(repoRoot, state, sessionState);

  const archivedFolderName = `${filenameTimestamp()}-${path.basename(currentFolderPath)}`;
  const archiveDirectory = archivedSpecsDir(repoRoot);
  const archivedFolderPath = path.join(archiveDirectory, archivedFolderName);
  await fs.mkdir(archiveDirectory, { recursive: true });
  await fs.rename(currentFolderPath, archivedFolderPath);

  const archivedRepoPath = relativeRepoPath(repoRoot, archivedFolderPath);
  sessionState.lastArchivedSpecPath = archivedRepoPath;

  return {
    archivedFolderPath: archivedRepoPath,
    archivedSpecPath: `${archivedRepoPath}/${SPEC_FILENAME}`,
  };
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