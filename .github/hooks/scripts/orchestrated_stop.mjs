import {
  appendSessionLog,
  loadHookInput,
  loadState,
  printJson,
  repoRootFromInput,
  runCli,
} from './orchestrated_common.mjs';

export async function main() {
  const inputData = await loadHookInput();
  const repoRoot = repoRootFromInput(inputData);
  const state = await loadState(repoRoot);
  const stopHookActive = inputData.stop_hook_active === true;

  if (stopHookActive) {
    return printJson({});
  }

  await appendSessionLog(repoRoot, {
    sessionId: inputData.sessionId,
    conversationState: state.conversationState,
    activeTaskName: state.activeTaskName,
    toolAuditCount: state.toolAudit.length,
    stopSignal: state.stopSignal,
    lastUpdated: state.lastUpdated,
  });

  return printJson({});
}

await runCli(main);