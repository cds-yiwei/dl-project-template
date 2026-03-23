import {
  detectRepoSkillHint,
  isStopRequest,
  loadHookInput,
  loadState,
  printJson,
  repoRootFromInput,
  runCli,
  saveState,
  truncateText,
} from './orchestrated_common.mjs';

function setActiveGoal(state, prompt) {
  const taskName = truncateText(prompt);
  state.activeTaskName = taskName;
  state.conversationState = 'executing';
  return taskName;
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
  const prompt = typeof inputData.prompt === 'string' ? inputData.prompt : '';
  const normalized = prompt.trim().toLowerCase();
  const goalCommand = parseGoalCommand(prompt);
  const repoSkillHint = detectRepoSkillHint(prompt);

  state.autoSkillHint = repoSkillHint?.key ?? null;

  if (normalized === 'resume') {
    state.stopSignal = false;
    state.conversationState = 'idle';
    state.activeTaskName = null;
    await saveState(repoRoot, state);
    return printJson({ systemMessage: 'orchestrated-agent: stop mode cleared; execution may continue.' });
  }

  if (normalized.startsWith('prefer verbose')) {
    state.preferences.verbosity = 'high';
    await saveState(repoRoot, state);
    return printJson({ systemMessage: 'orchestrated-agent: verbosity preference set to high.' });
  }

  if (normalized.startsWith('prefer brief') || normalized.startsWith('prefer concise')) {
    state.preferences.verbosity = 'low';
    await saveState(repoRoot, state);
    return printJson({ systemMessage: 'orchestrated-agent: verbosity preference set to low.' });
  }

  if (normalized.startsWith('prefer normal')) {
    state.preferences.verbosity = 'normal';
    await saveState(repoRoot, state);
    return printJson({ systemMessage: 'orchestrated-agent: verbosity preference set to normal.' });
  }

  if (normalized.startsWith('prefer skill ')) {
    const preferredSkill = prompt.trim().slice('prefer skill '.length).trim();
    state.preferences.preferredSkill = preferredSkill || null;
    await saveState(repoRoot, state);
    return printJson({
      systemMessage: `orchestrated-agent: preferred skill hint set to '${preferredSkill}'.`,
    });
  }

  if (isStopRequest(prompt)) {
    state.stopSignal = true;
    await saveState(repoRoot, state);
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
      await saveState(repoRoot, state);
      return printJson({
        systemMessage: `orchestrated-agent: no active goal is set. Start with 'goal: ...' before using '${goalCommand.command}:'.`,
      });
    }

    if (goalCommand.command === 'goal') {
      const taskName = setActiveGoal(state, goalCommand.value);
      await saveState(repoRoot, state);
      return printJson({
        systemMessage:
          `orchestrated-agent: active goal set to '${taskName}'. ` +
          'Treat later continue:/clarify: prompts as work on this same goal.',
      });
    }

    if (goalCommand.command === 'switch') {
      const taskName = setActiveGoal(state, goalCommand.value);
      await saveState(repoRoot, state);
      return printJson({
        systemMessage:
          `orchestrated-agent: switched active goal to '${taskName}'. ` +
          'Previous goal context is replaced.',
      });
    }

    state.conversationState = 'executing';
    await saveState(repoRoot, state);

    if (goalCommand.command === 'clarify') {
      const clarification = goalCommand.value || 'no extra clarification provided';
      return printJson({
        systemMessage:
          `orchestrated-agent: clarification recorded for active goal '${state.activeTaskName}': '${truncateText(clarification)}'. ` +
          'Keep working on the same goal and use this as added constraint/context.',
      });
    }

    const continuation = goalCommand.value || 'continue from the current state';
    return printJson({
      systemMessage:
        `orchestrated-agent: continue the active goal '${state.activeTaskName}' with '${truncateText(continuation)}'. ` +
        'Do not switch goals unless the user explicitly uses switch: or goal:.',
    });
  }

  let systemMessage;
  const { conversationState } = state;

  if (conversationState === 'idle' || conversationState === 'awaitingGoal' || state.activeTaskName === null) {
    const taskName = setActiveGoal(state, prompt);
    systemMessage =
      `orchestrated-agent: active goal set to '${taskName}'. ` +
      'Ask one concise clarifying question about constraints before editing or executing commands unless the prompt is already fully specified.';
  } else {
    const taskName = setActiveGoal(state, prompt);
    systemMessage =
      `orchestrated-agent: switched active goal to '${taskName}'. ` +
      'Ask one concise clarifying question before editing or executing commands unless the prompt is already fully specified.';
  }

  if (repoSkillHint) {
    systemMessage += ` ${repoSkillHint.instruction}`;
  }

  await saveState(repoRoot, state);
  return printJson({ systemMessage });
}

await runCli(main);