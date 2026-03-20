from orchestrated_common import append_session_log, load_hook_input, load_state, print_json, repo_root_from_input


def main() -> int:
    input_data = load_hook_input()
    repo_root = repo_root_from_input(input_data)
    state = load_state(repo_root)

    if input_data.get("stop_hook_active", False):
        return print_json({})

    append_session_log(
        repo_root,
        {
            "sessionId": input_data.get("sessionId"),
            "conversationState": state.get("conversationState"),
            "activeTaskName": state.get("activeTaskName"),
            "queuedTasks": len(state.get("taskQueue", [])),
            "feedbackCount": len(state.get("feedbackLog", [])),
            "toolAuditCount": len(state.get("toolAudit", [])),
            "stopSignal": state.get("stopSignal", False),
            "lastUpdated": state.get("lastUpdated"),
        },
    )

    return print_json({})


if __name__ == "__main__":
    raise SystemExit(main())