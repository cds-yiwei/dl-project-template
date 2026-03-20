from orchestrated_common import load_hook_input, load_state, print_json, repo_root_from_input, save_state


def main() -> int:
    input_data = load_hook_input()
    repo_root = repo_root_from_input(input_data)
    state = load_state(repo_root)

    state["lastTaskTimestamp"] = None
    state["stopSignal"] = False
    state["taskQueue"] = []
    state["conversationState"] = "idle"
    state["activeTaskName"] = None
    state["preferences"]["lastClarification"] = None
    state["feedbackHintShown"] = False
    save_state(repo_root, state)

    verbosity = state["preferences"].get("verbosity", "normal")
    preferred_skill = state["preferences"].get("preferredSkill") or "none"
    additional_context = (
        "Orchestrated-agent hooks active. "
        f"Verbosity={verbosity}; preferredSkill={preferred_skill}. "
        "Commands: 'resume' clears stop mode; 'prefer verbose' or 'prefer brief' adjusts style; "
        "'prefer skill <name>' stores a routing hint; 'rate great|okay|not good' records feedback; "
        "'stop this request' blocks future tool use until resumed."
    )

    response = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": additional_context,
        }
    }
    return print_json(response)


if __name__ == "__main__":
    raise SystemExit(main())