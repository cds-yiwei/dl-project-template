from orchestrated_common import load_hook_input, load_state, print_json, repo_root_from_input, save_state, truncate_text, utc_now_iso


FILE_EDIT_TOOLS = {"apply_patch", "create_file", "edit_notebook_file"}


def main() -> int:
    input_data = load_hook_input()
    repo_root = repo_root_from_input(input_data)
    state = load_state(repo_root)
    tool_name = input_data.get("tool_name", "")
    tool_response = input_data.get("tool_response", "")

    state["toolAudit"].append(
        {
            "tool": tool_name,
            "timestamp": utc_now_iso(),
            "task": state.get("activeTaskName"),
        }
    )
    state["toolAudit"] = state["toolAudit"][-20:]

    additional_context = None
    system_message = None

    if tool_name in FILE_EDIT_TOOLS:
        additional_context = (
            f"orchestrated-agent audit: {tool_name} completed for task '{state.get('activeTaskName') or 'unspecified-task'}'."
        )

    if tool_name == "run_in_terminal":
        summary = truncate_text(str(tool_response), 180)
        additional_context = (
            f"orchestrated-agent audit: terminal execution completed for '{state.get('activeTaskName') or 'unspecified-task'}'. "
            f"Summary: {summary}"
        )

    if not state.get("feedbackHintShown") and state.get("activeTaskName"):
        state["feedbackHintShown"] = True
        system_message = (
            "orchestrated-agent: record feedback with 'rate great', 'rate okay', or 'rate not good'; "
            "use 'stop this request' to block further tool use."
        )

    save_state(repo_root, state)

    response = {}
    if system_message:
        response["systemMessage"] = system_message
    if additional_context:
        response["hookSpecificOutput"] = {
            "hookEventName": "PostToolUse",
            "additionalContext": additional_context,
        }
    return print_json(response)


if __name__ == "__main__":
    raise SystemExit(main())