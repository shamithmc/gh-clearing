import json
import sys
from pathlib import Path

VALID_PROOFS = {"UNIT", "INTEGRATION", "CONFORMANCE", "COMPILER", "E2E"}
REQUIRED_GATES = {
    "level-1-core-gate.json",
    "level-1-complete-gate.json",
    "level-2-complete-gate.json",
    "level-3-start-gate.json",
}
SUITES_PATH = Path(".github/test-suites.json")


def fail(message):
    print(f"Error: {message}")
    sys.exit(1)


def main():
    try:
        suite_registry = json.loads(SUITES_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"Invalid test-suite registry {SUITES_PATH}: {exc}")
    suites = suite_registry.get("suites")
    if not isinstance(suites, dict) or not suites:
        fail(f"{SUITES_PATH} must define a non-empty suites object.")
    invalid_suite_definitions = [
        name for name, command in suites.items()
        if not str(name).strip() or not str(command).strip()
    ]
    if invalid_suite_definitions:
        fail(f"Invalid named test suites: {invalid_suite_definitions}")

    gates_dir = Path("gates")
    if not gates_dir.is_dir():
        fail("Missing gates directory.")
    directories = [path for path in gates_dir.iterdir() if path.is_dir()]
    if directories:
        fail(f"Gate definitions must be JSON files, not directories: {directories}")

    files = sorted(gates_dir.glob("*.json"))
    if not files:
        fail("At least one gate definition is required.")
    missing_gates = REQUIRED_GATES - {path.name for path in files}
    if missing_gates:
        fail(f"Missing milestone gates: {sorted(missing_gates)}")
    for path in files:
        try:
            gate = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            fail(f"Invalid gate file {path}: {exc}")
        required = {
            "gate_name", "required_proofs", "coverage_threshold", "test_suites"
        }
        missing = required - set(gate)
        if missing:
            fail(f"{path} is missing fields: {sorted(missing)}")
        if not str(gate["gate_name"]).strip():
            fail(f"{path} has an empty gate_name.")
        proofs = gate["required_proofs"]
        if not isinstance(proofs, list) or not proofs:
            fail(f"{path} must declare required_proofs.")
        invalid = set(proofs) - VALID_PROOFS
        if invalid:
            fail(f"{path} declares unsupported proofs: {sorted(invalid)}")
        threshold = gate["coverage_threshold"]
        if not isinstance(threshold, (int, float)) or threshold < 90 or threshold > 100:
            fail(f"{path} coverage_threshold must be between 90 and 100.")
        suites = gate["test_suites"]
        if not isinstance(suites, list) or not suites:
            fail(f"{path} must declare at least one test suite.")
        unknown_suites = set(suites) - set(suite_registry["suites"])
        if unknown_suites:
            fail(f"{path} references unknown test suites: {sorted(unknown_suites)}")
        print(f"Validated gate: {path}")

    print("Gate configuration validation PASSED.")


if __name__ == "__main__":
    main()
