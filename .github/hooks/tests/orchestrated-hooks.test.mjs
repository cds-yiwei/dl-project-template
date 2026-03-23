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

async function readState(repoDir) {
  const statePath = path.join(repoDir, '.git', 'copilot-hook-state', 'orchestrated-agent-state.json');
  const raw = await fs.readFile(statePath, 'utf8');
  return JSON.parse(raw);
}

async function readSessionLog(repoDir) {
  const logPath = path.join(repoDir, '.git', 'copilot-hook-state', 'orchestrated-agent-sessions.jsonl');
  const raw = await fs.readFile(logPath, 'utf8');
  return raw.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
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
  assert.doesNotMatch(response.hookSpecificOutput.additionalContext, /rate great|feedback/);

  const state = await readState(repoDir);
  assert.equal(state.stopSignal, false);
  assert.equal(state.conversationState, 'idle');
  assert.equal(state.activeTaskName, null);
  assert.equal(state.lastFeedbackHintTaskName, undefined);
  assert.equal(state.feedbackLog, undefined);
});

test('user prompt tracks a single active goal, preserves stop control, and resets on resume', async () => {
  const repoDir = await createTempRepo();

  const firstGoalResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'rewrite the agent hooks in typescript',
  });

  assert.match(firstGoalResponse.systemMessage, /active goal set/);
  let state = await readState(repoDir);
  assert.equal(state.conversationState, 'executing');
  assert.equal(state.activeTaskName, 'rewrite the agent hooks in typescript');
  assert.equal(state.autoSkillHint, null);

  const switchedGoalResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'document the hook state machine',
  });

  assert.match(switchedGoalResponse.systemMessage, /switched active goal/);
  state = await readState(repoDir);
  assert.equal(state.conversationState, 'executing');
  assert.equal(state.activeTaskName, 'document the hook state machine');

  const stopResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'stop:',
  });

  assert.match(stopResponse.systemMessage, /stop mode enabled/);
  state = await readState(repoDir);
  assert.equal(state.stopSignal, true);
  assert.equal(state.feedbackLog, undefined);

  const resumeResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'resume',
  });

  assert.match(resumeResponse.systemMessage, /stop mode cleared/);
  state = await readState(repoDir);
  assert.equal(state.stopSignal, false);
  assert.equal(state.conversationState, 'idle');
  assert.equal(state.activeTaskName, null);
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

test('user prompt supports explicit goal vocabulary for goal, clarify, continue, and switch', async () => {
  const repoDir = await createTempRepo();

  const goalResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'goal: migrate the hook docs to plain esm',
  });

  assert.match(goalResponse.systemMessage, /active goal set/);
  let state = await readState(repoDir);
  assert.equal(state.activeTaskName, 'migrate the hook docs to plain esm');
  assert.equal(state.conversationState, 'executing');

  const clarifyResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'clarify: keep the examples short and user-facing',
  });

  assert.match(clarifyResponse.systemMessage, /clarification recorded/);
  assert.match(clarifyResponse.systemMessage, /migrate the hook docs to plain esm/);
  state = await readState(repoDir);
  assert.equal(state.activeTaskName, 'migrate the hook docs to plain esm');

  await runHook('orchestrated_post_tool.mjs', {
    cwd: repoDir,
    tool_name: 'run_in_terminal',
    tool_response: 'command output',
  });

  state = await readState(repoDir);
  assert.equal(state.lastFeedbackHintTaskName, undefined);

  const continueResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'continue: add a short quick-start section too',
  });

  assert.match(continueResponse.systemMessage, /continue the active goal/);
  state = await readState(repoDir);
  assert.equal(state.activeTaskName, 'migrate the hook docs to plain esm');

  const switchResponse = await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'switch: add examples for switch and clarify commands',
  });

  assert.match(switchResponse.systemMessage, /switched active goal/);
  state = await readState(repoDir);
  assert.equal(state.activeTaskName, 'add examples for switch and clarify commands');
  assert.equal(state.conversationState, 'executing');
});

test('pre tool denies while stopped and asks during cooldown after actual execution', async () => {
  const repoDir = await createTempRepo();

  await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'rewrite hooks in typescript',
  });
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

  await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'fix the React login route and auth store',
  });

  const withSkillHint = await runHook('orchestrated_pre_tool.mjs', {
    cwd: repoDir,
    tool_name: 'apply_patch',
  });

  assert.match(withSkillHint.hookSpecificOutput.additionalContext, /Auto skill hint: frontend-developer/);

  await runHook('orchestrated_post_tool.mjs', {
    cwd: repoDir,
    tool_name: 'run_in_terminal',
    tool_response: 'completed command output',
  });

  const second = await runHook('orchestrated_pre_tool.mjs', {
    cwd: repoDir,
    tool_name: 'run_in_terminal',
  });

  assert.equal(second.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(second.hookSpecificOutput.permissionDecisionReason, /cooldown is active/);

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

test('post tool audits usage without emitting rating prompts', async () => {
  const repoDir = await createTempRepo();
  await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'rewrite hooks in typescript',
  });

  const response = await runHook('orchestrated_post_tool.mjs', {
    cwd: repoDir,
    tool_name: 'run_in_terminal',
    tool_response: 'terminal output that should be summarized for audit context',
  });

  assert.equal(response.systemMessage, undefined);
  assert.equal(response.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.match(response.hookSpecificOutput.additionalContext, /terminal execution completed/);

  const state = await readState(repoDir);
  assert.equal(state.lastFeedbackHintTaskName, undefined);
  assert.equal(state.toolAudit.length, 1);
  assert.equal(state.toolAudit[0].tool, 'run_in_terminal');

  const secondResponse = await runHook('orchestrated_post_tool.mjs', {
    cwd: repoDir,
    tool_name: 'run_in_terminal',
    tool_response: 'completed command output again',
  });
  assert.equal(secondResponse.systemMessage, undefined);
});

test('stop appends session log unless stop hook is already active', async () => {
  const repoDir = await createTempRepo();
  await runHook('orchestrated_user_prompt.mjs', {
    cwd: repoDir,
    prompt: 'rewrite hooks in typescript',
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
  assert.equal(entries[0].feedbackCount, undefined);
  assert.equal(entries[0].queuedTasks, undefined);
});