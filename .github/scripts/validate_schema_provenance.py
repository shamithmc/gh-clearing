import hashlib
import json
import os
import subprocess
import sys
import re
from fnmatch import fnmatch
from pathlib import Path

BILLING_PATTERNS = (
    "backend/src/main/java/com/airline/xml/**",
    "backend/src/main/java/com/airline/invoice/**",
    "backend/src/main/java/com/airline/domain/CreditNote*",
    "backend/src/main/java/com/airline/domain/Invoice*",
    "backend/src/main/java/com/airline/service/*CreditNote*",
    "backend/src/main/java/com/airline/service/*Invoice*",
    "backend/src/main/resources/db/migration/*credit_note*",
    "backend/src/main/resources/db/migration/*invoice_dispatch*",
    "backend/src/main/resources/schema/**",
    "backend/src/test/java/com/airline/dispatch/**",
    "backend/src/test/java/com/airline/xml/**",
)
PROVENANCE_PATH = Path(
    "backend/src/main/resources/schema/is-invoice.provenance.json"
)
# Official status is fail-closed. A licensed artifact may be admitted only by a
# separately reviewed change that adds its independently verified digest here.
TRUSTED_OFFICIAL_SCHEMA_DIGESTS = frozenset()


def run(args):
    result = subprocess.run(args, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "command failed")
    return result.stdout.splitlines()


def fail(message):
    print(f"Error: {message}")
    sys.exit(1)


def set_output(name, value):
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as output:
            output.write(f"{name}={value}\n")


def validate_classification(provenance):
    required = {
        "schema_owner", "artifact_classification", "official", "schema_file",
        "schema_version", "sha256", "source_reference", "limitations"
    }
    missing = required - set(provenance)
    if missing:
        raise ValueError(f"Schema provenance is missing fields: {sorted(missing)}")

    official = provenance["official"]
    classification = provenance["artifact_classification"]
    if not isinstance(official, bool):
        raise ValueError("Schema provenance field 'official' must be boolean.")
    if official:
        official_fields = {
            "standard_owner", "acquired_by", "acquired_at", "approval_hash"
        }
        missing_official = official_fields - set(provenance)
        if missing_official:
            raise ValueError(
                f"Official schema provenance is missing fields: {sorted(missing_official)}"
            )
        if classification != "licensed_official" or provenance["standard_owner"] != "IATA":
            raise ValueError(
                "An official IATA artifact must be classified as licensed_official."
            )
        if not str(provenance["source_reference"]).startswith("https://"):
            raise ValueError(
                "Official schema provenance requires a verifiable HTTPS source reference."
            )
        if str(provenance["sha256"]).lower() not in TRUSTED_OFFICIAL_SCHEMA_DIGESTS:
            raise ValueError(
                "Official schema digest is not in the independently reviewed trust set."
            )
    else:
        if classification != "application_owned":
            raise ValueError(
                "A non-official schema must be classified as application_owned."
            )
        if str(provenance["schema_owner"]).upper() == "IATA":
            raise ValueError(
                "An application-owned schema cannot identify IATA as its owner."
            )
        if not str(provenance["source_reference"]).startswith("repository://"):
            raise ValueError(
                "Application-owned schema provenance requires a repository source reference."
            )
    for field in ("schema_owner", "schema_version", "source_reference", "limitations"):
        if not str(provenance[field]).strip():
            raise ValueError(f"Schema provenance field '{field}' cannot be empty.")
    validate_upstream_reference(provenance.get("official_upstream_reference"))
    return official


def validate_upstream_reference(upstream):
    if upstream is None:
        return
    required = {
        "standard_owner", "schema_version", "source_reference", "sha256",
        "verified_at", "redistribution_status"
    }
    missing = required - set(upstream)
    if missing:
        raise ValueError(f"Official upstream reference is missing fields: {sorted(missing)}")
    if upstream["standard_owner"] != "IATA":
        raise ValueError("Official upstream reference must identify IATA as standard owner.")
    if not str(upstream["source_reference"]).startswith("https://www.iata.org/"):
        raise ValueError("Official upstream reference must use an IATA HTTPS source.")
    if not re.fullmatch(r"[0-9a-fA-F]{64}", str(upstream["sha256"])):
        raise ValueError("Official upstream reference requires a SHA-256 digest.")
    if upstream["redistribution_status"] != "not_bundled_permission_required":
        raise ValueError("Official upstream artifact must remain unbundled until permission is recorded.")
    for field in ("schema_version", "verified_at"):
        if not str(upstream[field]).strip():
            raise ValueError(f"Official upstream field '{field}' cannot be empty.")


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
        set_output("billing_changed", "false")
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
        set_output("billing_changed", "false")
        print("No billing/XML paths changed; schema-provenance gate skipped.")
        return
    set_output("billing_changed", "true")
    if not PROVENANCE_PATH.is_file():
        fail(f"Billing changes {billing_changes} require {PROVENANCE_PATH}.")

    try:
        provenance = json.loads(PROVENANCE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"Invalid schema provenance metadata: {exc}")
    try:
        official = validate_classification(provenance)
    except ValueError as exc:
        fail(str(exc))
    schema_path = PROVENANCE_PATH.parent / provenance["schema_file"]
    if not schema_path.is_file():
        fail(f"Provenance references missing schema file {schema_path}.")
    digest = hashlib.sha256(schema_path.read_bytes()).hexdigest()
    if digest.lower() != str(provenance["sha256"]).lower():
        fail("Schema SHA-256 does not match provenance metadata.")
    conformance = "official" if official else "application-contract-only"
    set_output("conformance_level", conformance)
    print(f"XML schema provenance validation PASSED ({conformance}).")


if __name__ == "__main__":
    main()
