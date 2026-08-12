import sys
from fnmatch import fnmatchcase
from pathlib import Path


EXPECTED_OWNERS = {
    "backend/src/main/java/com/airline/App.java": "@ground-handling/developers",
    "backend/src/main/resources/db/migration/V999__example.sql": "@ground-handling/db-admins",
    "frontend/src/App.tsx": "@ground-handling/developers",
    "topology.json": "@ground-handling/devops",
    "docs/PRD.md": "@ground-handling/platform-admin",
    "docs/PHASES.md": "@ground-handling/platform-admin",
    "docs/architecture-contract.md": "@ground-handling/tech-lead",
    "docs/development-contract.md": "@ground-handling/tech-lead",
    "decisions/architecture-log.json": "@ground-handling/tech-lead",
    "decisions/process-log.json": "@ground-handling/tech-lead",
}


def load_rules(path):
    rules = []
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        fields = line.split()
        if len(fields) < 2:
            raise ValueError(f"Invalid CODEOWNERS rule on line {line_number}: {raw_line}")
        rules.append((fields[0].lstrip("/"), fields[1:], line_number))
    return rules


def matches(pattern, repository_path):
    if pattern.endswith("/"):
        return repository_path.startswith(pattern)
    return fnmatchcase(repository_path, pattern)


def effective_owners(rules, repository_path):
    matching_rules = [rule for rule in rules if matches(rule[0], repository_path)]
    return matching_rules[-1] if matching_rules else None


def main():
    try:
        rules = load_rules(Path("CODEOWNERS"))
    except (OSError, ValueError) as error:
        print(f"CODEOWNERS validation failed: {error}")
        return 1

    failures = []
    for repository_path, expected_owner in EXPECTED_OWNERS.items():
        effective_rule = effective_owners(rules, repository_path)
        if effective_rule is None:
            failures.append(f"{repository_path}: no matching ownership rule")
            continue
        pattern, owners, line_number = effective_rule
        if owners != [expected_owner]:
            failures.append(
                f"{repository_path}: expected {expected_owner}, got {' '.join(owners)} "
                f"from line {line_number} ({pattern})"
            )

    if failures:
        print("CODEOWNERS precedence validation failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("CODEOWNERS precedence validation PASSED.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
