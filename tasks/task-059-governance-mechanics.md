---
id: TASK-059
title: "Complete governance mechanics"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-059-governance-mechanics.md"
  - "tasks/task-041-governance-remediation.md"
  - "tasks/task-042-pricing-benchmark.md"
  - "tasks/task-043-airline-billed-amounts.md"
  - "tasks/task-044-airline-expected-billing.md"
  - "tasks/task-045-airline-contract-expiry.md"
  - "tasks/task-046-airline-current-footprint.md"
  - "tasks/task-047-supplier-operational-footprint.md"
  - "tasks/task-048-ui-harmony-conversion.md"
  - "tasks/task-049-pdf-rendering-fix.md"
  - "tasks/task-050-dispute-management.md"
  - "tasks/task-051-e2e-unit-test-remediation.md"
  - "tasks/task-052-secure-dispute-actions.md"
  - "tasks/task-053-structural-tenant-isolation.md"
  - "tasks/task-054-real-credit-notes.md"
  - "tasks/task-055-workos-authkit.md"
  - "tasks/task-056-truthful-invoice-dispatch.md"
  - "tasks/task-057-safe-dispute-attachments.md"
  - "tasks/task-058-codeowners-precedence.md"
  - "tasks/task-fix-main-keycloak-ci.md"
  - "tasks/task-frontend-keycloak-auth.md"
  - "tasks/task-render-staging-config.md"
  - "tasks/task-render-storage-path-fix.md"
  - "tasks/task-staging-seed-data.md"
  - ".github/scripts/validate_dependencies.py"
  - ".github/scripts/validate_gate_config.py"
  - ".github/scripts/validate_schema_provenance.py"
  - ".github/scripts/validate_topology.py"
  - ".github/scripts/run_governance_validators.cmd"
  - ".github/scripts/tests/test_governance_validators.py"
  - ".github/test-suites.json"
  - ".github/workflows/ci.yml"
  - ".gitignore"
  - "backend/pom.xml"
  - "dependency-allowlist.json"
  - "gates/level-1-core-gate.json"
  - "gates/level-1-complete-gate.json"
  - "gates/level-2-complete-gate.json"
  - "gates/level-3-start-gate.json"
  - "obligations.json"
  - "topology.json"
proof: UNIT
invariants:
  - INV-01
  - INV-03
  - INV-05
  - INV-06
  - INV-07
  - INV-09
  - INV-12
---

## Scope

1. Make every Maven dependency explicit in the allowlist and remove the hidden test-starter exemption.
2. Complete missing invariant path mappings for contract lifecycle, MTOW, currency, and invoice uniqueness controls.
3. Trigger explicit invoice conformance proof from billing-path changes as well as declared proof type.
4. Reconcile machine-readable tenancy, local database, and staging deployment topology in CI.
5. Run frontend unit tests as a required CI step.
6. Define the missing Level 1 Core, Level 1 Complete, Level 2 Complete, and Level 3 Start gates and resolve every named suite through a registry.
7. Close merged work units so current task state respects lifecycle and concurrency rules.
8. Provide a Windows entry point that uses native Python, the Python launcher, or WSL Python.

## Authority acceptance

The user approved this combined Tier 3 CI, governance configuration, topology,
and task-lifecycle change before implementation.

## Exclusions

Official IATA artifact acquisition, hosted GitHub ruleset/approval enforcement,
broad application test expansion, product features, and database integrity work
remain separately governed tasks.
