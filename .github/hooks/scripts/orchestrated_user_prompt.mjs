import {
  appendToActiveSpec,
  archiveCurrentSpecBundle,
  createActiveSpecBundle,
  detectRepoSkillHint,
  isStopRequest,
  loadHookInput,
  loadSessionState,
  loadState,
  printJson,
  repoRootFromInput,
  runCli,
  saveSessionState,
  saveState,
  syncSessionTasksFromSpec,
  truncateText,
} from './orchestrated_common.mjs';

async function setActiveGoal(repoRoot, state, sessionState, prompt) {
  const taskName = truncateText(prompt);
  const bundle = await createActiveSpecBundle(repoRoot, taskName);

  state.activeTaskName = taskName;
  state.conversationState = 'executing';
  state.currentSpecFolderPath = bundle.folderPath;
  state.currentSpecPath = bundle.specPath;
  state.currentTaskListPath = null;

  sessionState.status = 'executing';
  sessionState.activeTaskName = taskName;
  sessionState.currentSpecFolderPath = bundle.folderPath;
  sessionState.currentSpecPath = bundle.specPath;
  sessionState.currentTaskListPath = null;
  sessionState.tasks = bundle.tasks;

  return taskName;
}

async function archiveActiveGoalIfPresent(repoRoot, state, sessionState) {
  const archived = await archiveCurrentSpecBundle(repoRoot, state, sessionState);
  if (!archived) {
    return null;
  }

  state.currentSpecFolderPath = null;
  state.currentSpecPath = null;
  state.currentTaskListPath = null;
  sessionState.currentSpecFolderPath = null;
  sessionState.currentSpecPath = null;
  sessionState.currentTaskListPath = null;

  return archived;
}

function parseGoalCommand(prompt) {
  const trimmed = prompt.trim();
  const match = /^(continue|clarify|switch|goal):\s*(.*)$/i.exec(trimmed);
  if (!match) {
    return null;
  }

  return {
    command: match[1].toLowerCase(),
    value: match[2].trim(),
  };
}

export async function main() {
  const inputData = await loadHookInput();
  const repoRoot = repoRootFromInput(inputData);
  const state = await loadState(repoRoot);
  const sessionState = await loadSessionState(repoRoot);
  const prompt = typeof inputData.prompt === 'string' ? inputData.prompt : '';
  const normalized = prompt.trim().toLowerCase();
  const goalCommand = parseGoalCommand(prompt);
  const repoSkillHint = detectRepoSkillHint(prompt);

  state.autoSkillHint = repoSkillHint?.key ?? null;

  if (normalized === 'resume') {
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
    return printJson({ systemMessage: 'orchestrated-agent: stop mode cleared; execution may continue.' });
  }

  if (normalized.startsWith('prefer verbose')) {
    state.preferences.verbosity = 'high';
    await saveState(repoRoot, state);
    await saveSessionState(repoRoot, sessionState);
    return printJson({ systemMessage: 'orchestrated-agent: verbosity preference set to high.' });
  }

  if (normalized.startsWith('prefer brief') || normalized.startsWith('prefer concise')) {
    state.preferences.verbosity = 'low';
    await saveState(repoRoot, state);
    await saveSessionState(repoRoot, sessionState);
    return printJson({ systemMessage: 'orchestrated-agent: verbosity preference set to low.' });
  }

  if (normalized.startsWith('prefer normal')) {
    state.preferences.verbosity = 'normal';
    await saveState(repoRoot, state);
    await saveSessionState(repoRoot, sessionState);
    return printJson({ systemMessage: 'orchestrated-agent: verbosity preference set to normal.' });
  }

  if (normalized.startsWith('prefer skill ')) {
    const preferredSkill = prompt.trim().slice('prefer skill '.length).trim();
    state.preferences.preferredSkill = preferredSkill || null;
    await saveState(repoRoot, state);
    await saveSessionState(repoRoot, sessionState);
    return printJson({
      systemMessage: `orchestrated-agent: preferred skill hint set to '${preferredSkill}'.`,
    });
  }

  if (isStopRequest(prompt)) {
    state.stopSignal = true;
    await saveState(repoRoot, state);
    await saveSessionState(repoRoot, sessionState);
    return printJson({
      systemMessage:
        "orchestrated-agent: stop mode enabled; future tool use will be denied until 'resume'.",
    });
  }

  if (goalCommand) {
    if ((goalCommand.command === 'goal' || goalCommand.command === 'switch') && !goalCommand.value) {
      return printJson({
        systemMessage: `orchestrated-agent: '${goalCommand.command}:' requires a short goal after the colon.`,
      });
    }

    if ((goalCommand.command === 'continue' || goalCommand.command === 'clarify') && state.activeTaskName === null) {
      state.conversationState = 'awaitingGoal';
      sessionState.status = 'awaitingGoal';
      await saveState(repoRoot, state);
      await saveSessionState(repoRoot, sessionState);
      return printJson({
        systemMessage: `orchestrated-agent: no active goal is set. Start with 'goal: ...' before using '${goalCommand.command}:'.`,
      });
    }

    if (goalCommand.command === 'goal') {
      const archived = await archiveActiveGoalIfPresent(repoRoot, state, sessionState);
      const taskName = await setActiveGoal(repoRoot, state, sessionState, goalCommand.value);
      await saveState(repoRoot, state);
      await saveSessionState(repoRoot, sessionState);
      return printJson({
        systemMessage:
          `orchestrated-agent: active goal set to '${taskName}'. ` +
          (archived ? `Archived the previous spec folder at '${archived.archivedFolderPath}'. ` : '') +
          'Start by brainstorming the spec, and if anything is unclear ask one concise clarifying question before editing or executing commands. Treat later continue:/clarify: prompts as work on this same goal.',
      });
    }

    if (goalCommand.command === 'switch') {
      const archived = await archiveActiveGoalIfPresent(repoRoot, state, sessionState);
      const taskName = await setActiveGoal(repoRoot, state, sessionState, goalCommand.value);
      await saveState(repoRoot, state);
      await saveSessionState(repoRoot, sessionState);
      return printJson({
        systemMessage:
          `orchestrated-agent: switched active goal to '${taskName}'. ` +
          (archived ? `Archived the previous spec folder at '${archived.archivedFolderPath}'. ` : '') +
          'Previous goal context is replaced. Brainstorm the new spec first, then resolve anything unclear before editing or executing commands.',
      });
    }

    state.conversationState = 'executing';
    sessionState.status = 'executing';

    if (goalCommand.command === 'clarify') {
      const clarification = goalCommand.value || 'no extra clarification provided';
      await appendToActiveSpec(repoRoot, state.currentSpecPath, 'clarifications', clarification);
      await syncSessionTasksFromSpec(repoRoot, state, sessionState);
      await saveState(repoRoot, state);
      await saveSessionState(repoRoot, sessionState);
      return printJson({
        systemMessage:
          `orchestrated-agent: clarification recorded for active goal '${state.activeTaskName}': '${truncateText(clarification)}'. ` +
          'Keep working on the same goal and use this as added constraint/context.',
      });
    }

    const continuation = goalCommand.value || 'continue from the current state';
  await appendToActiveSpec(repoRoot, state.currentSpecPath, 'sessionUpdates', continuation);
  await syncSessionTasksFromSpec(repoRoot, state, sessionState);
    await saveState(repoRoot, state);
    await saveSessionState(repoRoot, sessionState);
    return printJson({
      systemMessage:
        `orchestrated-agent: continue the active goal '${state.activeTaskName}' with '${truncateText(continuation)}'. ` +
        'Do not switch goals unless the user explicitly uses switch: or goal:.',
    });
  }

  let systemMessage;
  const { conversationState } = state;
  let archived = null;

  if (conversationState === 'idle' || conversationState === 'awaitingGoal' || state.activeTaskName === null) {
    const taskName = await setActiveGoal(repoRoot, state, sessionState, prompt);
    systemMessage =
      `orchestrated-agent: active goal set to '${taskName}'. ` +
      'Start with a short brainstorm for the spec. If anything is unclear, ask one concise clarifying question before editing or executing commands.';
  } else {
    archived = await archiveActiveGoalIfPresent(repoRoot, state, sessionState);
    const taskName = await setActiveGoal(repoRoot, state, sessionState, prompt);
    systemMessage =
      `orchestrated-agent: switched active goal to '${taskName}'. ` +
      (archived ? `Archived the previous spec folder at '${archived.archivedFolderPath}'. ` : '') +
      'Start by refreshing the spec with a short brainstorm, then ask one concise clarifying question before editing or executing commands if anything is unclear.';
  }

  if (repoSkillHint) {
    systemMessage += ` ${repoSkillHint.instruction}`;
  }

  await saveState(repoRoot, state);
  await saveSessionState(repoRoot, sessionState);
  return printJson({ systemMessage });
}

await runCli(main);