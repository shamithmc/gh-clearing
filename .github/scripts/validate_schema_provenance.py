import hashlib
import json
import os
import subprocess
import sys
from fnmatch import fnmatch
from pathlib import Path

BILLING_PATTERNS = (
    "backend/src/main/java/com/airline/xml/**",
    "backend/src/main/java/com/airline/invoice/**",
    "backend/src/main/java/com/airline/domain/Invoice*",
    "backend/src/main/java/com/airline/service/*Invoice*",
    "backend/src/main/resources/schema/**",
    "backend/src/test/java/com/airline/xml/**",
)
PROVENANCE_PATH = Path(
    "backend/src/main/resources/schema/is-invoice.provenance.json"
)


def run(args):
    result = subprocess.run(args, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "command failed")
    return result.stdout.splitlines()


def fail(message):
    print(f"Error: {message}")
    sys.exit(1)


def main():
    branch = (
        os.environ.get("WORK_UNIT_BRANCH")
        or os.environ.get("GITHUB_HEAD_REF")
    )
    if not branch:
        try:
            branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"])[0]
        except (RuntimeError, IndexError):
            branch = "main"
    if branch == "main":
        print("Running on main; schema-provenance change gate skipped.")
        return

    try:
        changed = run(["git", "diff", "--name-only", "origin/main...HEAD"])
    except RuntimeError as exc:
        fail(f"Cannot determine changed billing paths: {exc}")
    billing_changes = [
        path for path in changed
        if any(fnmatch(path, pattern) for pattern in BILLING_PATTERNS)
    ]
    if not billing_changes:
        print("No billing/XML paths changed; schema-provenance gate skipped.")
        return
    if not PROVENANCE_PATH.is_file():
        fail(
            f"Billing changes {billing_changes} require {PROVENANCE_PATH}. "
            "The bundled schema is not accepted as official without provenance."
        )

    try:
        provenance = json.loads(PROVENANCE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"Invalid schema provenance metadata: {exc}")
    required = {
        "standard_owner", "official", "schema_file", "schema_version",
        "sha256", "source_reference", "acquired_by", "acquired_at",
        "approval_hash"
    }
    missing = required - set(provenance)
    if missing:
        fail(f"Schema provenance is missing fields: {sorted(missing)}")
    if provenance["standard_owner"] != "IATA" or provenance["official"] is not True:
        fail("Schema provenance must identify an official IATA artifact.")
    schema_path = PROVENANCE_PATH.parent / provenance["schema_file"]
    if not schema_path.is_file():
        fail(f"Provenance references missing schema file {schema_path}.")
    digest = hashlib.sha256(schema_path.read_bytes()).hexdigest()
    if digest.lower() != str(provenance["sha256"]).lower():
        fail("Schema SHA-256 does not match provenance metadata.")
    for field in (
        "schema_version", "source_reference", "acquired_by", "acquired_at",
        "approval_hash"
    ):
        if not str(provenance[field]).strip():
            fail(f"Schema provenance field '{field}' cannot be empty.")

    print("Official IATA schema provenance validation PASSED.")


if __name__ == "__main__":
    main()
