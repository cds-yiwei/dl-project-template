import {
  loadHookInput,
  loadState,
  printJson,
  repoRootFromInput,
  runCli,
  saveState,
} from './orchestrated_common.mjs';

export async function main() {
  const inputData = await loadHookInput();
  const repoRoot = repoRootFromInput(inputData);
  const state = await loadState(repoRoot);

  state.lastTaskTimestamp = null;
  state.stopSignal = false;
  state.conversationState = 'idle';
  state.activeTaskName = null;

  await saveState(repoRoot, state);

  const verbosity = state.preferences.verbosity ?? 'normal';
  const preferredSkill = state.preferences.preferredSkill ?? 'none';
  const additionalContext =
    'Orchestrated-agent hooks active. ' +
    `Verbosity=${verbosity}; preferredSkill=${preferredSkill}. ` +
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