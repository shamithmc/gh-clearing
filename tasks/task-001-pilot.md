---
id: TASK-001
title: "Run bootstrap pilot scenarios to exercise operating controls"
owner: Shamith
paths:
  - "CODEOWNERS"
  - "obligations.json"
  - "dependency-allowlist.json"
proof: COMPILER
invariants:
  - INV-12
---

# TASK-001: Bootstrap Pilot

This task executes the Wave 0 pilot tests to verify that the mechanical branch-protection controls are active and functioning correctly before starting application development.

## Steps

1. **Verify Path Claim Collision**:
   * Create two active development branches (`task-001a` and `task-001b`).
   * In both branches, declare a Unit of Work markdown file in `tasks/` that claims overlapping files in the `paths` front-matter (e.g., `obligations.json`).
   * Trigger the build pipeline on both branches.
   * **Verification**: The CI run for the second branch **MUST** fail the pipeline execution due to the path lock block (§7.3).

2. **Verify Guard-Change Block**:
   * Create a branch changing the contents of `CODEOWNERS` or any CI workflow script.
   * Open a pull request.
   * Attempt to self-approve or merge the pull request.
   * **Verification**: The branch protection rules **MUST** block the merge, demanding independent review (§2.4, §7.4).

3. **Verify Routine Compilation**:
   * Verify that the repository is correctly formatted, containing valid JSON and Markdown.
   * **Verification**: The pipeline **MUST** verify the `COMPILER` proof and pass successfully.
