import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = process.cwd();
const hooksRoot = path.join(repoRoot, '.github', 'hooks');
const scriptsRoot = path.join(hooksRoot, 'scripts');

async function createTempRepo() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'orchestrated-hooks-'));
  await fs.mkdir(path.join(tempRoot, '.git'), { recursive: true });
  return tempRoot;
}

function resolveRepoPath(repoDir, repoRelativePath) {
  return path.join(repoDir, ...repoRelativePath.split('/'));
}

async function readJsonFile(repoDir, repoRelativePath) {
  const raw = await fs.readFile(resolveRepoPath(repoDir, repoRelativePath), 'utf8');
  return JSON.parse(raw);
}

async function writeJsonFile(repoDir, repoRelativePath, value) {
  await fs.writeFile(resolveRepoPath(repoDir, repoRelativePath), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readState(repoDir) {
  return readJsonFile(repoDir, '.github/hooks/runtime/orchestrated-agent-state.json');
}

async function readSessionState(repoDir) {
  return readJsonFile(repoDir, '.github/hooks/runtime/orchestrated-agent-session.json');
}

async function readSessionLog(repoDir) {
  const logPath = resolveRepoPath(repoDir, '.github/hooks/runtime/orchestrated-agent-sessions.jsonl');
  const raw = await fs.readFile(logPath, 'utf8');
  return raw.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

async function readActiveSpec(repoDir, state) {
  assert.ok(state?.currentSpecPath, 'expected currentSpecPath to be set');
  return readJsonFile(repoDir, state.currentSpecPath);
}

async function updateActiveSpec(repoDir, state, updater) {
  const spec = await readActiveSpec(repoDir, state);
  const nextSpec = updater(structuredClone(spec));
  await writeJsonFile(repoDir, state.currentSpecPath, nextSpec);
}

async function readArchivedFolders(repoDir) {
  const archiveDir = resolveRepoPath(repoDir, 'docs/specs/archive');
  const entries = await fs.readdir(archiveDir);
  return entries.sort();
}

async function readArchivedSpec(repoDir, archivedFolderPath) {
  return readJsonFile(repoDir, `${archivedFolderPath}/spec.json`);
}

async function pathExists(repoDir, repoRelativePath) {
  try {
    await fs.access(resolveRepoPath(repoDir, repoRelativePath));
    return true;
  } catch {
    return false;
  }
}

function runHook(scriptName, payload) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(scriptsRoot, scriptName)], {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Hook ${scriptName} exited with ${code}: ${stderr || stdout}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout || '{}'));
      } catch (error) {
        reject(new Error(`Invalid JSON from ${scriptName}: ${stdout}\n${stderr}\n${error}`));
      }
    });

    child.stdin.end(JSON.stringify(payload));
  });
}

test('session start resets volatile state and returns startup context', async () => {
  const repoDir = await createTempRepo();
  const response = await runHook('orchestrated_session_start.mjs', { cwd: repoDir });

  assert.equal(response.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(response.hookSpecificOutput.additionalContext, /Orchestrated-agent hooks active/);
  assert.match(response.hookSpecificOutput.additionalContext, /spec-driven workflow/);

  const state = await readState(repoDir);
  assert.equal(state.stopSignal, false);
  assert.equal(state.conversationState, 'idle');
  assert.equal(state.activeTaskName, null);
  assert.equal(state.currentSpecPath, null);
  assert.equal(state.currentSpecFolderPath, null);
  assert.equal(state.currentTaskListPath ?? null, null);

  const sessionState = await readSessionState(repoDir);
  assert.equal(sessionState.activeTaskName, null);
  assert.equal(sessionState.currentSpecPath, null);
  assert.equal(sessionState.currentSpecFolderPath, null);
  assert.equal(sessionState.currentTaskListPath ?? null, null);
  assert.equal(sessionState.status, 'idle');
  assert.deepEqual(sessionState.tasks ?? [], []);
});

test('user prompt creates a schema-backed spec.json and archives the previous goal folder on switch', async () => {
  const repoDir = await createTempRepo();

  const firstGoalResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'rewrite the agent hooks in typescript',
  });

  assert.match(firstGoalResponse.systemMessage, /active goal set/);
  let state = await readState(repoDir);
  assert.equal(state.currentSpecFolderPath, 'docs/specs/current/rewrite-the-agent-hooks-in-typescript');
  assert.equal(state.currentSpecPath, 'docs/specs/current/rewrite-the-agent-hooks-in-typescript/spec.json');
  assert.equal(state.currentTaskListPath ?? null, null);

  let sessionState = await readSessionState(repoDir);
  assert.equal(sessionState.currentSpecPath, state.currentSpecPath);
  assert.equal(sessionState.tasks.length, 4);

  const activeSpec = await readActiveSpec(repoDir, state);
  assert.equal(activeSpec.$schema, '../../spec.schema.json');
  assert.equal(activeSpec.task, 'rewrite the agent hooks in typescript');
  assert.ok(Array.isArray(activeSpec.tasks));
  assert.equal(activeSpec.tasks.length, 4);
  assert.equal(activeSpec.tasks[0].status, 'in_progress');
  assert.equal(activeSpec.clarifications.length, 0);
  assert.equal(activeSpec.sessionUpdates.length, 0);

  const switchedGoalResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'document the hook state machine',
  });

  assert.match(switchedGoalResponse.systemMessage, /switched active goal/);
  assert.match(switchedGoalResponse.systemMessage, /Archived the previous spec folder/);

  state = await readState(repoDir);
  assert.equal(state.currentSpecFolderPath, 'docs/specs/current/document-the-hook-state-machine');
  assert.equal(state.currentSpecPath, 'docs/specs/current/document-the-hook-state-machine/spec.json');

  const archivedFolders = await readArchivedFolders(repoDir);
  assert.equal(archivedFolders.length, 1);
  assert.match(archivedFolders[0], /^\d{4}-\d{2}-\d{2}t.*-rewrite-the-agent-hooks-in-typescript$/i);
  const archivedSpec = await readArchivedSpec(repoDir, `docs/specs/archive/${archivedFolders[0]}`);
  assert.equal(archivedSpec.task, 'rewrite the agent hooks in typescript');
  assert.equal(archivedSpec.tasks[0].status, 'in_progress');
});

test('explicit goal commands append into spec.json and session tasks sync from explicit task statuses', async () => {
  const repoDir = await createTempRepo();

  await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'goal: migrate the hook docs to plain esm',
  });

  let state = await readState(repoDir);
  let spec = await readActiveSpec(repoDir, state);
  assert.equal(spec.tasks[0].status, 'in_progress');

  const clarifyResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'clarify: keep the examples short and user-facing',
  });

  assert.match(clarifyResponse.systemMessage, /clarification recorded/);
  state = await readState(repoDir);
  spec = await readActiveSpec(repoDir, state);
  assert.equal(spec.clarifications.length, 1);
  assert.match(spec.clarifications[0].text, /keep the examples short and user-facing/);

  await updateActiveSpec(repoDir, state, (draft) => {
    draft.tasks[0].status = 'completed';
    draft.tasks[1].status = 'in_progress';
    return draft;
  });

  await runHook('orchestrated_pre_tool.mjs', {
    cwd: repoDir,
    tool_name: 'apply_patch',
  });

  let sessionState = await readSessionState(repoDir);
  assert.equal(sessionState.tasks[0].status, 'completed');
  assert.equal(sessionState.tasks[1].status, 'in_progress');

  const continueResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'continue: add a short quick-start section too',
  });

  assert.match(continueResponse.systemMessage, /continue the active goal/);
  state = await readState(repoDir);
  spec = await readActiveSpec(repoDir, state);
  assert.equal(spec.sessionUpdates.length, 1);
  assert.match(spec.sessionUpdates[0].text, /add a short quick-start section too/);

  await updateActiveSpec(repoDir, state, (draft) => {
    draft.tasks[1].status = 'completed';
    draft.tasks[2].status = 'in_progress';
    return draft;
  });

  await runHook('orchestrated_post_tool.mjs', {
    cwd: repoDir,
    tool_name: 'apply_patch',
    tool_response: 'patch applied',
  });

  sessionState = await readSessionState(repoDir);
  assert.equal(sessionState.tasks[1].status, 'completed');
  assert.equal(sessionState.tasks[2].status, 'in_progress');

  const switchResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'switch: add examples for switch and clarify commands',
  });

  assert.match(switchResponse.systemMessage, /switched active goal/);
  const archivedFolders = await readArchivedFolders(repoDir);
  assert.equal(archivedFolders.length, 1);
  const archivedSpec = await readArchivedSpec(repoDir, `docs/specs/archive/${archivedFolders[0]}`);
  assert.equal(archivedSpec.clarifications.length, 1);
  assert.equal(archivedSpec.sessionUpdates.length, 1);
  assert.equal(archivedSpec.tasks[0].status, 'completed');
  assert.equal(archivedSpec.tasks[1].status, 'completed');
  assert.equal(archivedSpec.tasks[2].status, 'in_progress');
});

test('user prompt injects repo skill guidance for backend, frontend, and full-stack work', async () => {
  const repoDir = await createTempRepo();

  const backendResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'fix the FastAPI roles service and add an Alembic migration',
  });

  assert.match(backendResponse.systemMessage, /backend-developer/);
  let state = await readState(repoDir);
  assert.equal(state.autoSkillHint, 'backend-developer');

  const frontendResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'update the React users page route and TanStack query hooks',
  });

  assert.match(frontendResponse.systemMessage, /frontend-developer/);
  state = await readState(repoDir);
  assert.equal(state.autoSkillHint, 'frontend-developer');

  const fullStackResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'full-stack change: update backend API and frontend page together',
  });

  assert.match(fullStackResponse.systemMessage, /backend-developer' and 'frontend-developer|backend-developer.*frontend-developer/);
  state = await readState(repoDir);
  assert.equal(state.autoSkillHint, 'full-stack');
});

test('user prompt treats explicit backend and frontend path mentions as full-stack work', async () => {
  const repoDir = await createTempRepo();

  const response = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'update backend/src/app/api/v1/roles.py and frontend/src/routes/roles.ts together',
  });

  assert.match(response.systemMessage, /explicitly mentions both backend\/ and frontend\/ paths/);
  assert.match(response.systemMessage, /backend-developer/);
  assert.match(response.systemMessage, /frontend-developer/);

  const state = await readState(repoDir);
  assert.equal(state.autoSkillHint, 'full-stack');
});

test('user prompt recognizes repo-specific backend and frontend signals', async () => {
  const repoDir = await createTempRepo();

  const backendResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'update casbin_guard handling in backend/src/app/api/v1/policies.py and seed access_policy data',
  });

  assert.match(backendResponse.systemMessage, /backend-developer/);
  let state = await readState(repoDir);
  assert.equal(state.autoSkillHint, 'backend-developer');

  const frontendResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'fix routeTree generation and auth-routing behavior in frontend/src/routes and src/fetch/request-json.ts',
  });

  assert.match(frontendResponse.systemMessage, /frontend-developer/);
  state = await readState(repoDir);
  assert.equal(state.autoSkillHint, 'frontend-developer');
});

test('pre tool denies while stopped and includes active JSON spec context', async () => {
  const repoDir = await createTempRepo();

  await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'rewrite hooks in typescript',
  });

  const first = await runHook('orchestrated_pre_tool.mjs', {
    cwd: repoDir,
    tool_name: 'run_in_terminal',
  });

  assert.equal(first.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.match(first.hookSpecificOutput.additionalContext, /Active goal/);
  assert.match(first.hookSpecificOutput.additionalContext, /spec\.json/);

  await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'stop:',
  });

  const denied = await runHook('orchestrated_pre_tool.mjs', {
    cwd: repoDir,
    tool_name: 'apply_patch',
  });

  assert.equal(denied.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /stop mode is active/);
});

test('post tool audits usage without emitting rating prompts and syncs explicit tasks from spec.json', async () => {
  const repoDir = await createTempRepo();
  await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'rewrite hooks in typescript',
  });

  let state = await readState(repoDir);
  await updateActiveSpec(repoDir, state, (draft) => {
    draft.tasks[0].status = 'completed';
    draft.tasks[1].status = 'in_progress';
    return draft;
  });

  const response = await runHook('orchestrated_post_tool.mjs', {
    cwd: repoDir,
    tool_name: 'run_in_terminal',
    tool_response: 'terminal output that should be summarized for audit context',
  });

  assert.equal(response.systemMessage, undefined);
  assert.equal(response.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.match(response.hookSpecificOutput.additionalContext, /terminal execution completed/);

  state = await readState(repoDir);
  assert.equal(state.toolAudit.length, 1);
  assert.equal(state.toolAudit[0].tool, 'run_in_terminal');

  const sessionState = await readSessionState(repoDir);
  assert.equal(sessionState.tasks[0].status, 'completed');
  assert.equal(sessionState.tasks[1].status, 'in_progress');
});

test('stop archives the full JSON spec folder and records the archive path', async () => {
  const repoDir = await createTempRepo();
  await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'rewrite hooks in typescript',
  });

  const state = await readState(repoDir);
  await updateActiveSpec(repoDir, state, (draft) => {
    draft.tasks[0].status = 'completed';
    draft.tasks[1].status = 'in_progress';
    draft.notes.push({ timestamp: '2026-03-23T00:00:00.000Z', text: 'session note' });
    return draft;
  });

  const emptyResponse = await runHook('orchestrated_stop.mjs', {
    cwd: repoDir,
    stop_hook_active: true,
    sessionId: 'skip-me',
  });
  assert.deepEqual(emptyResponse, {});

  await runHook('orchestrated_stop.mjs', {
    cwd: repoDir,
    stop_hook_active: false,
    sessionId: 'session-123',
  });

  const entries = await readSessionLog(repoDir);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].sessionId, 'session-123');
  assert.equal(entries[0].activeTaskName, 'rewrite hooks in typescript');
  assert.match(entries[0].archivedSpecPath, /^docs\/specs\/archive\//);

  const archivedFolders = await readArchivedFolders(repoDir);
  assert.equal(archivedFolders.length, 1);
  assert.match(archivedFolders[0], /^\d{4}-\d{2}-\d{2}t.*-rewrite-hooks-in-typescript$/i);

  assert.equal(await pathExists(repoDir, 'docs/specs/current/rewrite-hooks-in-typescript/spec.json'), false);

  const archivedSpec = await readArchivedSpec(repoDir, `docs/specs/archive/${archivedFolders[0]}`);
  assert.equal(archivedSpec.tasks[0].status, 'completed');
  assert.equal(archivedSpec.tasks[1].status, 'in_progress');
  assert.equal(archivedSpec.notes.length, 1);

  const sessionState = await readSessionState(repoDir);
  assert.equal(sessionState.currentSpecPath, null);
  assert.equal(sessionState.currentSpecFolderPath, null);
  assert.equal(sessionState.currentTaskListPath ?? null, null);
  assert.equal(sessionState.lastArchivedSpecPath, entries[0].archivedSpecPath);
});