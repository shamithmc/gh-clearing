---
id: TASK-RESTRUCTURE
title: "Restructure repository into separate backend and frontend directories"
owner: Shamith
paths:
  - "development-contract.md"
  - "CODEOWNERS"
  - ".github/scripts/validate_work_unit.py"
  - ".github/scripts/validate_dependencies.py"
  - ".github/workflows/ci.yml"
  - ".gitignore"
  - "backend/pom.xml"
  - "backend/src/main/resources/application.yml"
proof: COMPILER
invariants: []
---

# TASK-RESTRUCTURE: Repository Restructuring

This task splits the repository into separate `backend/` and `frontend/` directories and updates all governance, CODEOWNERS, and CI validation scripts to match the new structure.
