import {
  appendSessionLog,
  archiveCurrentSpecBundle,
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
  const stopHookActive = inputData.stop_hook_active === true;

  if (stopHookActive) {
    return printJson({});
  }

  const archivedBundle = await archiveCurrentSpecBundle(repoRoot, state, sessionState);
  const archivedSpecPath = archivedBundle?.archivedFolderPath ?? null;

  state.currentSpecFolderPath = null;
  state.currentSpecPath = null;
  state.currentTaskListPath = null;
  sessionState.currentSpecFolderPath = null;
  sessionState.currentSpecPath = null;
  sessionState.currentTaskListPath = null;
  sessionState.lastArchivedSpecPath = archivedSpecPath;
  sessionState.status = 'stopped';
  sessionState.tasks = [];

  await saveState(repoRoot, state);
  await saveSessionState(repoRoot, sessionState);

  await appendSessionLog(repoRoot, {
    sessionId: inputData.sessionId,
    conversationState: state.conversationState,
    activeTaskName: state.activeTaskName,
    archivedSpecPath,
    toolAuditCount: state.toolAudit.length,
    stopSignal: state.stopSignal,
    lastUpdated: state.lastUpdated,
  });

  return printJson({});
}

await runCli(main);