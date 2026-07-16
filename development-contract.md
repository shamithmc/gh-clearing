# Canonical Development Operating Contract: Airline Ground Handling Cost Management Platform

**Document Version:** 1.0.0  
**Status:** Canonical / Active  
**Scope:** Development operating governance and mechanical code controls  
**Created:** 2026-07-16  

---

## Normative Note

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in BCP 14 (RFC 2119, RFC 8174) when, and only when, they appear in all capitals, as shown here.

This document defines **HOW** the system is built, integrated, and verified. It is the companion to the Architecture Contract ([architecture-contract.md](file:///c:/Workspace/SK/GH-Project/architecture-contract.md)), which defines **WHAT** the system is. Where this document and the Architecture Contract conflict, the Architecture Contract **MUST** win.

---

## 1. Organizing Units

The development process is built strictly from the following five durable organizing units:

1.1 **Ownership Lane**: A designated subdirectory partition within the repository mapping to a specific code team or system component. An Ownership Lane is **NEVER** bound to a release.  
1.2 **Acceptance Checkpoint**: A state boundary in the repository requiring mechanical confirmation of test proof validation before code changes can be integrated. An Acceptance Checkpoint owns criteria, **NEVER** active work.  
1.3 **Unit of Work**: A structured, transient markdown file defining a specific feature, bug fix, or refactor task with associated code paths and validation proofs. A Unit of Work is **NEVER** bound to more than one active user or subagent.  
1.4 **Coordinating Role**: An assigned, state-free agent or human persona responsible for executing task dispatches, reviewing conformance logs, or resolving disputes. A Coordinating Role is **NEVER** bound to a single person or persistent session state.  
1.5 **Concurrency Unit**: A logical namespace claim represented by a set of path-lock entries preventing overlapping modifications during development. A Concurrency Unit is **NEVER** bound to more than one active branch.

---

## 2. Ownership Rules

2.1 Exactly one Owner (represented by a GitHub team or codeowner pattern) **MUST** be assigned to any given directory or file surface. Multiple owners per surface are prohibited.  
2.2 The Tenant/Module that publishes a contract interface (represented by IATA standard schemas or OpenAPI definitions) **MUST** own its schema file and its conformance tests.  
2.3 An architectural obligation manifest file (`obligations.json`) **MUST** map every architectural invariant (INV-01 through INV-12 defined in BCP 14 style in the Architecture Contract) to an accountable Owner. The CI pipeline **MUST** validate this manifest for completeness on every pull request.  
2.4 Any pull request containing changes to CI configurations, CODEOWNERS rules, or branch protection files **MUST NOT** be approved by any user who authored or contributed to the pull request. Self-approval of guard/fence changes is prohibited.

---

## 3. The One-Home Rule

3.1 Every durable fact in the development lifecycle **MUST** have exactly one home, one owner, and a defined lifecycle. The system enforces the following fact map:

| Fact | Home (Path) | Owner | Lifecycle |
|---|---|---|---|
| System Requirements | [PRD.md](file:///c:/Workspace/SK/GH-Project/PRD.md) | Platform Admin | Amended |
| Architecture Contract | [architecture-contract.md](file:///c:/Workspace/SK/GH-Project/architecture-contract.md) | Tech Lead | Amended |
| Development Contract | [development-contract.md](file:///c:/Workspace/SK/GH-Project/development-contract.md) | Tech Lead | Amended |
| Work Task Definitions | `tasks/task-*.md` | Developer | Deleted-at-close |
| Backend Source Code | `backend/src/` | Codeowners Team | Permanent |
| Frontend Source Code | `frontend/src/` | Codeowners Team | Permanent |
| Database Schema Migrations | `backend/src/main/resources/db/migration/` | DB Admin | Permanent (Append-only) |
| Operational Flight Records | `backend/src/test/resources/data/flights/` | QA Team | Permanent |
| Architectural Invariants Manifest | `obligations.json` | Tech Lead | Overwritten-in-place |
| PR Review Approval Records | `.github/reviews/` | CI Engine | Append |
| Test Suites & Verification Proofs | `backend/src/test/` and `frontend/src/test/` | QA Team | Permanent |
| Architecture Decision Log | `decisions/architecture-log.json` | Tech Lead | Append |
| Process Decision Log | `decisions/process-log.json` | Tech Lead | Append |

3.2 The following practices are **MUST NOT** be permitted:
* No per-release folders (e.g. `releases/v1/` or similar).
* No per-owner note files (e.g. `notes-john.md` or similar).
* No status-in-prose (such as text comments declaring "this is 50% done").
* No duplicated contract content in code comments or docstrings.

3.3 The mainline branch (`main`) is the single source of truth for "what is done". Hand-asserted status indicators outside the mainline state **MUST NOT** be trusted or referenced.

---

## 4. Work-Unit Lifecycle

4.1 A Unit of Work **MUST** be declared in a markdown file in the `tasks/` directory, adhering to the following YAML front-matter schema:
```yaml
id: TASK-01
title: "Implement pricing formula PF-01"
owner: developer-john
paths:
  - "src/main/java/com/airline/pricing/PF01Calculator.java"
  - "src/test/java/com/airline/pricing/PF01CalculatorTest.java"
proof: UNIT
invariants:
  - INV-04
```

4.2 The Unit of Work **MUST** transition through the following state machine:
* `DRAFT`: Task is being defined; transitions to `READY` when validated by CI.
* `READY`: Validated for schema compliance; transitions to `DISPATCHED` by the Coordinating Role.
* `DISPATCHED`: Locked for development; transitions to `REVIEW` by the developer upon PR submission.
* `REVIEW`: Validation proofs are executed and verified by CI; transitions to `DONE` upon merge.
* `DONE`: Changes merged to mainline, and the task file is deleted.

4.3 The system **MUST** enforce path-claim locks. CI **MUST** block dispatch of any Unit of Work if its declared `paths` intersect with the `paths` of any already `DISPATCHED` or `REVIEW` Unit of Work on any other branch.

4.4 The system enforces the following closed, versioned list of Verification Proof Kinds:
* `UNIT`: Complete execution of JUnit tests, passing with 100% success.
* `INTEGRATION`: Execution of Spring Boot integration tests and Flyway schema migration validation, passing with 100% success.
* `CONFORMANCE`: Validation of generated IATA IS-XML invoices against IATA schema specifications, passing with 100% success.
* `COMPILER`: Compilation of all source files with zero errors and zero warnings, passing.

Unsupported Verification Proof Kinds **MUST** fail validation and block the PR. The list widens only by explicit amendment to this contract.

4.5 Minimal-Context Rule: An agent or developer session **MUST** read exactly N=3 documents to complete a task (the Unit of Work file, the target code file, and the target test file). If an N+1th document is required, the missing fact **MUST** be moved to its canonical home, and the process is flagged as a defect.

---

## 5. Coordinator / Roles

5.1 The system defines the following coordinating roles:
* **Tech Lead**: Human role owning final merge approval, architectural overrides, and process changes.
* **Developer**: Human role owning unit-of-work creation, code modification, and proof validation.
* **AI Coding Agent**: AI subagent role executing dispatched units of work in a sandboxed terminal.

5.2 AI Coding Agents **MUST NOT** perform the following actions:
* Self-approving pull requests.
* Modifying database schemas directly without independent review.
* Updating the `architecture-contract.md` or `development-contract.md` files.

Delegation Boundary: AI subagents can decide code structure and test implementations but **MUST** escalate all schema modifications and configuration changes to the Tech Lead.

5.3 State Recovery Rule: If an active workspace or CI runner fails, the agent or developer **MUST** be able to recover execution state entirely by reading the active Unit of Work file on the current branch. The storage of private, non-committed state is prohibited.

---

## 6. Branch, PR, Merge, and Review

6.1 Mainline-Always-Green: The `main` branch **MUST** compile and pass all tests at all times.  
6.2 Revert Rights: Any commit merged to `main` that breaks compilation or fails any test suite **MUST** be reverted immediately by any observer without requiring review.  
6.3 The system enforces the following closed, versioned list of Merge Tiers:
* **Tier 1 (Routine Merge)**: Documentation or test modifications. Trigger: CI verification of `UNIT` proof. Action: Auto-merged by CI.
* **Tier 2 (Logic Merge)**: Source code changes in Java/React. Trigger: Successful CI checks + 1 independent codeowner approval. Action: Merged by Developer.
* **Tier 3 (Authority Merge)**: Changes to schemas, contracts, or security rules. Trigger: Successful CI checks + 1 independent codeowner approval + Tech Lead acceptance. Action: Merged by Tech Lead.

6.4 Machine-Greppable Review Record: Every merge **MUST** contain a machine-greppable review record file in `.github/reviews/` in the following JSON format:
```json
{
  "pr": 123,
  "reviewer": "user1",
  "status": "APPROVED",
  "timestamp": "2026-07-16T09:00:00Z",
  "proof_verified": "CONFORMANCE",
  "hash": "abc123xyz"
}
```

6.5 Schema Changes Merge Order: Any PR changing a database schema or contract specification **MUST** be merged to `main` before any PR consuming that schema or contract can be dispatched.

---

## 7. Mechanical Controls

The system's integrity is protected by the following mechanized fences enforced by CI, CODEOWNERS, and branch protection:

7.1 **Dependency Allowlist Block**: CI **MUST** block any pull request containing imports or dependencies not defined in `dependency-allowlist.json` (Defends `INV-01`).  
7.2 **Path Ownership Block**: GitHub branch protection **MUST** block merging of any PR unless approved by the team listed in `CODEOWNERS` for the modified paths (Defends `INV-01` & `INV-02`).  
7.3 **Path-Claim Lock Block**: CI **MUST** fail pipeline execution on any branch if its Unit of Work file claims paths already locked by another branch's active Unit of Work.  
7.4 **Contract Protection Block**: Branch protection **MUST** block any merge changing `architecture-contract.md` or `development-contract.md` without explicit Tech Lead signature.  
7.5 **Obligation-Coverage Tripwire**: CI **MUST** fail any PR if the `obligations.json` manifest does not link the changed paths to at least one active architectural invariant validation test (Defends `INV-01` through `INV-12`).  
7.6 **Conformance Gate Block**: CI **MUST** block merging of any billing code changes unless the `CONFORMANCE` test suite successfully generates and validates an IATA XML invoice (Defends `INV-09`).  
7.7 **Work-Unit Hygiene Gate**: CI **MUST** block any PR that does not contain a single, valid Unit of Work markdown file in `tasks/` matching the branch name.  
7.8 **Verification-Kind Block**: CI **MUST** execute and validate the specific verification proof kind declared in the Unit of Work front-matter; mismatch or failure blocks the PR from merging.  
7.9 **Deployment Topology Reconciliation**: Environment deployment pipelines **MUST** block any deployment unless the configurations exactly match the multi-tenant namespace constraints defined in `topology.json` (Defends `INV-01`).

---

## 8. Concurrency

8.1 The platform enforces a maximum Concurrency Ceiling of 3 active parallel work streams.  
8.2 The Concurrency Ceiling is enforced by the Path-Claim Lock control. A 4th branch **MAY** run only if its path claim has zero intersection with the active locks of the 3 dispatched branches.  
8.3 Any raise in the concurrency limit **MUST** be recorded as a decision in the Process Log citing evidence of pipeline capacity.

---

## 9. Gates / Milestones

9.1 A milestone gate is defined exclusively as a JSON configuration in the `gates/` directory specifying a named test suite, required code coverage thresholds (minimum 90% for contract code), and validation proof kinds.  
9.2 Creating a directory containing gate names (e.g. `gates/milestone-1/` or similar) is blocked by CI; any gate configuration **MUST** live as a file.

---

## 10. Bootstrap / Wave 0 & Pilot

10.1 Minimal Instantiation: The bootstrap process consists of creating the Git repository, configuring the GitHub Action workflows, and generating the initial `CODEOWNERS` and `obligations.json` files.  
10.2 The Pilot program **MUST** exercise the following three test scenarios before the development process is declared active:
10.2.1 A routine code change demonstrating successful merge.
10.2.2 A deliberately failing guard change (such as an unapproved CI file edit) to verify that CODEOWNERS blocks the merge.
10.2.3 A path-claim collision test (two active branches claiming the same file) to verify that the path lock fails the second branch's pipeline.

---

## 11. Decision Boundaries

11.1 The system maintains two decision logs:
* **Architecture Decision Log**: Located at `decisions/architecture-log.json`, requiring Tech Lead approval.
* **Process Decision Log**: Located at `decisions/process-log.json`, requiring consensus from the development team.

11.2 Decisions **MUST** be appended to these logs as JSON structures containing the decision ID, title, author, context, and approval hash.

---

## Appendix: Open Questions

The following questions represent areas of ambiguity in the team setup and constraints that **MUST** be resolved in subsequent amendments to this contract:
1. **GitHub vs. GitLab Selection**: The final platform host (GitHub Actions vs. GitLab CI) is assumed to be GitHub; this must be confirmed by the system owner.
2. **Reviewer Capacity**: Whether a single human developer is authorized to act as codeowner reviewer for another developer's PR, or whether a secondary reviewer is required, is unspecified.
3. **AI Coding Agent Runner Isolation**: The sandboxing constraints and resource limits for the AI subagent terminal runner are undefined.
4. **Deploy Token Management**: The credential rotation process and storage rules for deployment tokens used during Topology Reconciliation are unspecified.
