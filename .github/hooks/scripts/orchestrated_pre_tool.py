import time

from orchestrated_common import load_hook_input, load_state, print_json, repo_root_from_input, save_state


COOLDOWN_TOOLS = {"run_in_terminal", "runSubagent", "search_subagent"}
WRITE_OR_EXECUTION_TOOLS = {
    "apply_patch",
    "create_file",
    "edit_notebook_file",
    "run_in_terminal",
    "runSubagent",
    "search_subagent",
    "create_and_run_task",
}


def main() -> int:
    input_data = load_hook_input()
    repo_root = repo_root_from_input(input_data)
    state = load_state(repo_root)
    tool_name = input_data.get("tool_name", "")

    if state.get("stopSignal"):
        response = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": "orchestrated-agent stop mode is active. User must send 'resume' first.",
            }
        }
        return print_json(response)

    now_ms = int(time.time() * 1000)
    permission_decision = None
    permission_reason = None

    if tool_name in COOLDOWN_TOOLS and state.get("lastTaskTimestamp"):
        elapsed_ms = now_ms - int(state["lastTaskTimestamp"])
        if elapsed_ms < int(state.get("cooldownMs", 5000)):
            permission_decision = "ask"
            permission_reason = (
                "orchestrated-agent cooldown is active for high-impact tools; confirm before continuing immediately."
            )

    additional_parts = []
    preferred_skill = state["preferences"].get("preferredSkill")
    verbosity = state["preferences"].get("verbosity", "normal")
    clarification = state["preferences"].get("lastClarification")
    active_task = state.get("activeTaskName")

    if active_task:
        additional_parts.append(f"Active queued task: {active_task}")
    if clarification:
        additional_parts.append(f"Latest clarification: {clarification}")
    if preferred_skill:
        additional_parts.append(f"Preferred skill hint: {preferred_skill}")
    if verbosity != "normal":
        additional_parts.append(f"Response verbosity preference: {verbosity}")
    if state.get("conversationState") == "clarifying":
        additional_parts.append("A clarifying turn is preferred before irreversible edits or terminal execution when the request is ambiguous.")

    if tool_name in COOLDOWN_TOOLS:
        state["lastTaskTimestamp"] = now_ms

    if tool_name in WRITE_OR_EXECUTION_TOOLS and state.get("conversationState") == "clarifying":
        state["conversationState"] = "executing"

    save_state(repo_root, state)

    hook_output = {"hookEventName": "PreToolUse"}
    if permission_decision:
        hook_output["permissionDecision"] = permission_decision
        hook_output["permissionDecisionReason"] = permission_reason
    if additional_parts:
        hook_output["additionalContext"] = " | ".join(additional_parts)

    return print_json({"hookSpecificOutput": hook_output})


if __name__ == "__main__":
    raise SystemExit(main())