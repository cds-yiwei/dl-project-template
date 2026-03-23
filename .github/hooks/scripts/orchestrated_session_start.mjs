import {
  loadHookInput,
  loadSessionState,
  loadState,
  printJson,
  repoRootFromInput,
  runCli,
  saveSessionState,
  saveState,
} from './orchestrated_common.mjs';

export async function main() {
  const inputData = await loadHookInput();
  const repoRoot = repoRootFromInput(inputData);
  const state = await loadState(repoRoot);
  const sessionState = await loadSessionState(repoRoot);

  state.lastTaskTimestamp = null;
  state.stopSignal = false;
  state.conversationState = 'idle';
  state.activeTaskName = null;
  state.currentSpecFolderPath = null;
  state.currentSpecPath = null;
  state.currentTaskListPath = null;

  sessionState.status = 'idle';
  sessionState.activeTaskName = null;
  sessionState.currentSpecFolderPath = null;
  sessionState.currentSpecPath = null;
  sessionState.currentTaskListPath = null;
  sessionState.tasks = [];

  await saveState(repoRoot, state);
  await saveSessionState(repoRoot, sessionState);

  const verbosity = state.preferences.verbosity ?? 'normal';
  const preferredSkill = state.preferences.preferredSkill ?? 'none';
  const additionalContext =
    'Orchestrated-agent hooks active. ' +
    `Verbosity=${verbosity}; preferredSkill=${preferredSkill}. ` +
    'Use the repo-local spec-driven workflow: start by brainstorming the task spec, keep the active schema-backed spec.json under docs/specs/current, and archive the full spec folder when the task changes or the session ends. ' +
    "Commands: 'resume' clears stop mode; 'prefer verbose' or 'prefer brief' adjusts style; " +
    "'prefer skill <name>' stores a routing hint; " +
    "'stop:' blocks future tool use until resumed.";

  return printJson({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext,
    },
  });
}

await runCli(main);