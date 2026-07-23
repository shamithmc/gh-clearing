import json
import os
import sys
from pathlib import Path


DECISIVE_STATES = {"APPROVED", "CHANGES_REQUESTED", "DISMISSED"}


def fail(message):
    print(f"Error: {message}")
    sys.exit(1)


def review_order(review):
    return (
        str(review.get("submitted_at") or ""),
        int(review.get("id") or 0),
    )


def effective_approvers(reviews, pr_author, head_sha):
    latest_by_reviewer = {}
    for review in reviews:
        reviewer = str(review.get("user", {}).get("login", "")).strip().lower()
        state = str(review.get("state", "")).upper()
        if not reviewer or state not in DECISIVE_STATES:
            continue
        previous = latest_by_reviewer.get(reviewer)
        if previous is None or review_order(review) > review_order(previous):
            latest_by_reviewer[reviewer] = review

    return sorted(
        reviewer
        for reviewer, review in latest_by_reviewer.items()
        if reviewer != pr_author
        and str(review.get("state", "")).upper() == "APPROVED"
        and str(review.get("commit_id", "")).lower() == head_sha
    )


def main():
    if os.environ.get("GITHUB_EVENT_NAME") not in {
        "pull_request",
        "pull_request_review",
    }:
        print("Not a pull request event; approval validation skipped.")
        return

    pr_author = os.environ.get("PR_AUTHOR", "").strip().lower()
    head_sha = os.environ.get("PR_HEAD_SHA", "").strip().lower()
    reviews_path = Path(
        os.environ.get("APPROVED_REVIEWS_PATH", "approved-reviews.json")
    )
    if not pr_author or not head_sha:
        fail("Missing PR_AUTHOR or PR_HEAD_SHA environment metadata.")

    try:
        reviews = json.loads(reviews_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"Could not load GitHub review evidence: {exc}")
    if not isinstance(reviews, list):
        fail("GitHub review evidence must be a JSON array.")

    approvers = effective_approvers(reviews, pr_author, head_sha)
    if not approvers:
        fail(
            "Current pull-request head has no effective APPROVED review from "
            "a user other than the pull-request author."
        )

    print(
        "Independent GitHub approval validation PASSED. "
        f"Current-head approver(s): {', '.join(approvers)}"
    )


if __name__ == "__main__":
    main()
