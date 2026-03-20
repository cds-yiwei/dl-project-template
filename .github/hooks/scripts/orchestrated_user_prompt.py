from orchestrated_common import (
    load_hook_input,
    load_state,
    parse_feedback,
    print_json,
    repo_root_from_input,
    save_state,
    truncate_text,
    utc_now_iso,
)


def enqueue_task(state, prompt: str) -> str:
    state["taskCounter"] += 1
    task_name = truncate_text(prompt)
    task = {
        "id": f"task-{state['taskCounter']}",
        "name": task_name,
        "priority": 1,
        "payload": {"goal": prompt, "queuedAt": utc_now_iso()},
    }
    state["taskQueue"].append(task)
    state["activeTaskName"] = task_name
    return task_name


def main() -> int:
    input_data = load_hook_input()
    repo_root = repo_root_from_input(input_data)
    state = load_state(repo_root)
    prompt = input_data.get("prompt", "")
    normalized = prompt.strip().lower()

    if normalized == "resume":
        state["stopSignal"] = False
        state["conversationState"] = "idle"
        save_state(repo_root, state)
        return print_json({"systemMessage": "orchestrated-agent: stop mode cleared; execution may continue."})

    if normalized.startswith("prefer verbose"):
        state["preferences"]["verbosity"] = "high"
        save_state(repo_root, state)
        return print_json({"systemMessage": "orchestrated-agent: verbosity preference set to high."})

    if normalized.startswith("prefer brief") or normalized.startswith("prefer concise"):
        state["preferences"]["verbosity"] = "low"
        save_state(repo_root, state)
        return print_json({"systemMessage": "orchestrated-agent: verbosity preference set to low."})

    if normalized.startswith("prefer normal"):
        state["preferences"]["verbosity"] = "normal"
        save_state(repo_root, state)
        return print_json({"systemMessage": "orchestrated-agent: verbosity preference set to normal."})

    if normalized.startswith("prefer skill "):
        preferred_skill = prompt.strip()[len("prefer skill ") :].strip()
        state["preferences"]["preferredSkill"] = preferred_skill or None
        save_state(repo_root, state)
        return print_json({"systemMessage": f"orchestrated-agent: preferred skill hint set to '{preferred_skill}'."})

    feedback = parse_feedback(prompt)
    if feedback:
        state["feedbackLog"].append(
            {
                "task": state.get("activeTaskName") or "unspecified-task",
                "rating": feedback,
                "timestamp": utc_now_iso(),
                "skill": state["preferences"].get("preferredSkill"),
            }
        )
        if feedback == "Stop this request":
            state["stopSignal"] = True
            save_state(repo_root, state)
            return print_json({"systemMessage": "orchestrated-agent: stop mode enabled; future tool use will be denied until 'resume'."})

        save_state(repo_root, state)
        return print_json({"systemMessage": f"orchestrated-agent: recorded feedback '{feedback}' for '{state.get('activeTaskName') or 'unspecified-task'}'."})

    system_message = None
    conversation_state = state.get("conversationState", "idle")

    if conversation_state in {"idle", "awaitingGoal"}:
        task_name = enqueue_task(state, prompt)
        state["conversationState"] = "clarifying"
        system_message = (
            f"orchestrated-agent: queued goal '{task_name}'. "
            "Ask one concise clarifying question about constraints before editing or executing commands unless the prompt is already fully specified."
        )
    elif conversation_state == "clarifying":
        state["preferences"]["lastClarification"] = truncate_text(prompt, 240)
        state["conversationState"] = "executing"
        system_message = "orchestrated-agent: clarification captured; continue with the highest-priority queued task."
    else:
        task_name = enqueue_task(state, prompt)
        state["conversationState"] = "clarifying"
        system_message = (
            f"orchestrated-agent: current execution remains active and a follow-up goal '{task_name}' was queued. "
            "Finish the current task cleanly or explicitly switch context."
        )

    save_state(repo_root, state)
    return print_json({"systemMessage": system_message})


if __name__ == "__main__":
    raise SystemExit(main())