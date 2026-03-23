import {
  loadHookInput,
  loadState,
  printJson,
  repoRootFromInput,
  runCli,
  saveState,
  truncateText,
  utcNowIso,
} from './orchestrated_common.mjs';

const COOLDOWN_TOOLS = new Set(['run_in_terminal', 'runSubagent', 'search_subagent']);
const FILE_EDIT_TOOLS = new Set(['apply_patch', 'create_file', 'edit_notebook_file']);

export async function main() {
  const inputData = await loadHookInput();
  const repoRoot = repoRootFromInput(inputData);
  const state = await loadState(repoRoot);
  const toolName = typeof inputData.tool_name === 'string' ? inputData.tool_name : '';
  const toolResponse = inputData.tool_response;

  state.toolAudit.push({
    tool: toolName,
    timestamp: utcNowIso(),
    task: state.activeTaskName,
  });
  state.toolAudit = state.toolAudit.slice(-20);

  if (COOLDOWN_TOOLS.has(toolName)) {
    state.lastTaskTimestamp = Date.now();
  }

  let additionalContext;
  let systemMessage;

  if (FILE_EDIT_TOOLS.has(toolName)) {
    additionalContext = `orchestrated-agent audit: ${toolName} completed for task '${state.activeTaskName ?? 'unspecified-task'}'.`;
  }

  if (toolName === 'run_in_terminal') {
    const summary = truncateText(String(toolResponse ?? ''), 180);
    additionalContext =
      `orchestrated-agent audit: terminal execution completed for '${state.activeTaskName ?? 'unspecified-task'}'. ` +
      `Summary: ${summary}`;
  }

  await saveState(repoRoot, state);

  const response = {};
  if (systemMessage) {
    response.systemMessage = systemMessage;
  }
  if (additionalContext) {
    response.hookSpecificOutput = {
      hookEventName: 'PostToolUse',
      additionalContext,
    };
  }
  return printJson(response);
}

await runCli(main);