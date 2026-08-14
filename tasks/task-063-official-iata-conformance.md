---
id: TASK-063
title: "Restore verified official IATA schema reference"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-062-truthful-xml-conformance.md"
  - "tasks/task-063-official-iata-conformance.md"
  - ".github/scripts/validate_schema_provenance.py"
  - ".github/scripts/tests/test_governance_validators.py"
  - "backend/src/main/resources/schema/README.md"
  - "backend/src/main/resources/schema/is-invoice.provenance.json"
  - "docs/design.md"
  - "obligations.json"
proof: UNIT
invariants:
  - INV-01
  - INV-09
  - INV-12
---

## Scope

1. Restore the official IATA IS-XML v4.4.0.0 upstream schema URL removed by task 062.
2. Record the verified remote size and SHA-256 without conflating it with GHCP's local XSD.
3. Preserve the official artifact's copyright restriction by not bundling it without permission.
4. Record the two imported official schema dependencies required for offline validation.
5. Validate that an upstream reference cannot silently reclassify or authorize bundling a local artifact.
6. Include the user's pre-existing correction to the IATA PDF URL in `docs/design.md`.
7. Close merged task 062.

## Authority acceptance

The user supplied the official schema URL, approved correcting its removal, and
explicitly included the pre-existing `docs/design.md` URL correction in this task.

## External blocker

The verified official XSD states that reproduction or transmission requires
IATA's express prior written permission and imports two additional v4.4.0.0
schemas. Official offline validation remains blocked until that permission and
the complete dependency set are supplied.
