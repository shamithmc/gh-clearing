import json
import os
import re
import sys
from pathlib import Path

VALID_PROOFS = {"UNIT", "INTEGRATION", "CONFORMANCE", "COMPILER", "E2E"}


def fail(message):
    print(f"Error: {message}")
    sys.exit(1)


def parse_scalar_front_matter(path):
    content = path.read_text(encoding="utf-8")
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not match:
        fail(f"Could not parse front matter from {path}")
    result = {}
    for line in match.group(1).splitlines():
        if ":" in line and not line.lstrip().startswith("-"):
            key, value = line.split(":", 1)
            result[key.strip()] = value.strip().strip("\"'")
    return result


def main():
    if os.environ.get("GITHUB_EVENT_NAME") != "pull_request":
        print("Not a pull request; review-record validation skipped.")
        return

    pr_number = os.environ.get("PR_NUMBER", "").strip()
    pr_author = os.environ.get("PR_AUTHOR", "").strip().lower()
    head_sha = os.environ.get("PR_HEAD_SHA", "").strip().lower()
    reviews_path = Path(
        os.environ.get("APPROVED_REVIEWS_PATH", "approved-reviews.json")
    )
    if not pr_number or not pr_author or not head_sha:
        fail("Missing PR_NUMBER, PR_AUTHOR, or PR_HEAD_SHA environment metadata.")
    try:
        reviews = json.loads(reviews_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"Could not load GitHub review evidence: {exc}")

    record_path = Path(".github/reviews") / f"{pr_number}.json"
    if not record_path.is_file():
        fail(
            f"Missing review record {record_path}. Add it only after an "
            "independent approval has been submitted."
        )

    try:
        record = json.loads(record_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"Invalid review record JSON: {exc}")

    required = {
        "pr", "reviewer", "status", "timestamp", "proof_verified", "hash"
    }
    missing = required - set(record)
    if missing:
        fail(f"Review record is missing fields: {sorted(missing)}")
    if set(record) != required:
        fail(f"Review record contains unsupported fields: {sorted(set(record) - required)}")
    if str(record["pr"]) != pr_number:
        fail(f"Review record PR {record['pr']} does not match PR {pr_number}.")
    if record["status"] != "APPROVED":
        fail("Review record status must be APPROVED.")
    if record["proof_verified"] not in VALID_PROOFS:
        fail(f"Unsupported proof kind '{record['proof_verified']}'.")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", record["timestamp"]):
        fail("Review record timestamp must be UTC in YYYY-MM-DDTHH:MM:SSZ format.")
    if not re.fullmatch(r"[0-9a-fA-F]{40,64}", str(record["hash"])):
        fail("Review record hash must be a 40-to-64 character hexadecimal proof hash.")
    reviewer = str(record["reviewer"]).lower()
    if reviewer == pr_author:
        fail("The pull request author cannot approve their own change.")
    matching_approval = any(
        str(review.get("state", "")).upper() == "APPROVED"
        and str(review.get("user", {}).get("login", "")).lower() == reviewer
        and str(review.get("commit_id", "")).lower() == head_sha
        for review in reviews
    )
    if not matching_approval:
        fail(
            f"Reviewer '{record['reviewer']}' does not have an APPROVED GitHub "
            f"review for current head {head_sha} on this pull request."
        )

    branch = os.environ.get("GITHUB_HEAD_REF", "")
    matches = [
        path for path in Path("tasks").glob("*.md")
        if branch in path.name
        or path.name.replace("task-", "").replace(".md", "") in branch
    ]
    if len(matches) != 1:
        fail(f"Expected one active task for branch '{branch}', found {matches}.")
    task = parse_scalar_front_matter(matches[0])
    if task.get("state") != "REVIEW":
        fail("The reviewed work unit must be in REVIEW state.")
    if record["proof_verified"] != task.get("proof"):
        fail(
            f"Review proof '{record['proof_verified']}' does not match task "
            f"proof '{task.get('proof')}'."
        )

    print(f"Review record {record_path} validation PASSED.")


if __name__ == "__main__":
    main()
