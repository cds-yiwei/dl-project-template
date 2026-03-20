import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict


STATE_DIRNAME = "copilot-hook-state"
STATE_FILENAME = "orchestrated-agent-state.json"
SESSION_LOG_FILENAME = "orchestrated-agent-sessions.jsonl"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_hook_input() -> Dict[str, Any]:
    try:
        return json.load(sys.stdin)
    except json.JSONDecodeError:
        return {}


def repo_root_from_input(input_data: Dict[str, Any]) -> Path:
    return Path(input_data.get("cwd", os.getcwd()))


def state_dir(repo_root: Path) -> Path:
    return repo_root / ".git" / STATE_DIRNAME


def state_path(repo_root: Path) -> Path:
    return state_dir(repo_root) / STATE_FILENAME


def session_log_path(repo_root: Path) -> Path:
    return state_dir(repo_root) / SESSION_LOG_FILENAME


def default_state() -> Dict[str, Any]:
    return {
        "feedbackLog": [],
        "lastTaskTimestamp": None,
        "cooldownMs": 5000,
        "stopSignal": False,
        "preferences": {
            "verbosity": "normal",
            "preferredSkill": None,
            "lastClarification": None,
        },
        "skillScores": [],
        "taskQueue": [],
        "conversationState": "idle",
        "activeTaskName": None,
        "taskCounter": 0,
        "toolAudit": [],
        "feedbackHintShown": False,
        "lastUpdated": utc_now_iso(),
    }


def load_state(repo_root: Path) -> Dict[str, Any]:
    path = state_path(repo_root)
    if not path.exists():
        return default_state()

    try:
        with path.open("r", encoding="utf-8") as handle:
            state = json.load(handle)
    except (json.JSONDecodeError, OSError):
        return default_state()

    merged = default_state()
    merged.update(state)
    merged["preferences"].update(state.get("preferences", {}))
    return merged


def save_state(repo_root: Path, state: Dict[str, Any]) -> None:
    directory = state_dir(repo_root)
    directory.mkdir(parents=True, exist_ok=True)
    state["lastUpdated"] = utc_now_iso()
    with state_path(repo_root).open("w", encoding="utf-8") as handle:
        json.dump(state, handle, indent=2)


def append_session_log(repo_root: Path, entry: Dict[str, Any]) -> None:
    directory = state_dir(repo_root)
    directory.mkdir(parents=True, exist_ok=True)
    with session_log_path(repo_root).open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry) + "\n")


def print_json(payload: Dict[str, Any]) -> int:
    print(json.dumps(payload))
    return 0


def truncate_text(value: str, limit: int = 140) -> str:
    compact = " ".join(value.strip().split())
    if len(compact) <= limit:
        return compact
    return compact[: limit - 3] + "..."


def parse_feedback(text: str) -> str | None:
    normalized = text.strip().lower()
    if normalized in {"rate great", "feedback great", "great"}:
        return "Great"
    if normalized in {"rate okay", "feedback okay", "okay"}:
        return "Okay"
    if normalized in {"rate not good", "feedback not good", "not good"}:
        return "Not good"
    if normalized == "stop this request":
        return "Stop this request"
    return None
