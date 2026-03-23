import {
  loadHookInput,
  loadSessionState,
  loadState,
  printJson,
  repoRootFromInput,
  runCli,
  saveSessionState,
  saveState,
  syncSessionTasksFromSpec,
} from './orchestrated_common.mjs';

const COOLDOWN_TOOLS = new Set(['run_in_terminal', 'runSubagent', 'search_subagent']);

export async function main() {
  const inputData = await loadHookInput();
  const repoRoot = repoRootFromInput(inputData);
  const state = await loadState(repoRoot);
  const sessionState = await loadSessionState(repoRoot);
  const toolName = typeof inputData.tool_name === 'string' ? inputData.tool_name : '';

  await syncSessionTasksFromSpec(repoRoot, state, sessionState);

  if (state.stopSignal) {
    return printJson({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          "orchestrated-agent stop mode is active. User must send 'resume' first.",
      },
    });
  }

  const nowMs = Date.now();
  let permissionDecision;
  let permissionDecisionReason;

  if (COOLDOWN_TOOLS.has(toolName) && state.lastTaskTimestamp !== null) {
    const elapsedMs = nowMs - state.lastTaskTimestamp;
    if (elapsedMs < state.cooldownMs) {
      permissionDecision = 'ask';
      permissionDecisionReason =
        'orchestrated-agent cooldown is active for high-impact tools; confirm before continuing immediately.';
    }
  }

  const additionalParts = [];
  const preferredSkill = state.preferences.preferredSkill;
  const autoSkillHint = state.autoSkillHint;
  const verbosity = state.preferences.verbosity ?? 'normal';
  const activeTask = state.activeTaskName;
  const currentSpecPath = state.currentSpecPath;

  if (activeTask) {
    additionalParts.push(`Active goal: ${activeTask}`);
  }
  if (currentSpecPath) {
    additionalParts.push(`Active spec: ${currentSpecPath}`);
  }
  if (preferredSkill) {
    additionalParts.push(`Preferred skill hint: ${preferredSkill}`);
  }
  if (autoSkillHint) {
    additionalParts.push(`Auto skill hint: ${autoSkillHint}`);
  }
  if (verbosity !== 'normal') {
    additionalParts.push(`Response verbosity preference: ${verbosity}`);
  }

  await saveState(repoRoot, state);
  await saveSessionState(repoRoot, sessionState);

  const hookSpecificOutput = {
    hookEventName: 'PreToolUse',
  };
  if (permissionDecision) {
    hookSpecificOutput.permissionDecision = permissionDecision;
  }
  if (permissionDecisionReason) {
    hookSpecificOutput.permissionDecisionReason = permissionDecisionReason;
  }
  if (additionalParts.length > 0) {
    hookSpecificOutput.additionalContext = additionalParts.join(' | ');
  }

  return printJson({ hookSpecificOutput });
}

await runCli(main);