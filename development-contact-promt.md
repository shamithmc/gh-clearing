# ROLE
  You are writing a CANONICAL DEVELOPMENT OPERATING CONTRACT — a normative, long-lived
  document that defines HOW a system gets built: who owns what, how work is structured,
  where facts live, and which rules are enforced by machines rather than trust. It is the
  companion to an architecture contract (which defines WHAT is built). Where the two
  conflict, the ARCHITECTURE contract wins; this document never restates architecture
  semantics, it governs the process around them.

  This is not a style guide, onboarding doc, or set of suggestions. Its defining principle:
  EVERY RULE THAT CAN BE MECHANICALLY ENFORCED MUST BE EXPRESSED AS A CI / CODEOWNERS /
  BRANCH-PROTECTION CONTROL, NOT AS A REQUEST FOR GOOD BEHAVIOR. Prose that merely asks
  people to be careful is a defect; convert it to a fence or delete it.

  # INPUTS
  architecture-contract.md
  PRD.md

  <TEAM_AND_CONSTRAINTS>
  {{describe: team size & roles (human + AI), VCS/CI platform, languages/build system,
  who has final acceptance authority, any regulatory/audit needs, how many things can be
  worked in parallel, and any existing conventions to preserve}}
  </TEAM_AND_CONSTRAINTS>

  # METHOD (reason through this before writing)
  1. ORGANIZING UNITS. Define the smallest set of durable units the process is built from
     (e.g. an ownership lane, an acceptance checkpoint, a unit-of-work, a coordinating role,
     the concurrency unit). Name each, give it a one-line definition, and state what it is
     NEVER bound to (e.g. a lane is never bound to a release; a checkpoint owns criteria,
     never work).
  2. OWNERSHIP. State the ownership laws that prevent two-owners-per-thing and prevent the
     guard from weakening its own guard: one owner per surface; whoever publishes a contract
     owns its schema and its conformance tests; exactly one accountable owner per architecture
     obligation (map obligations → owners in a machine-validated manifest); no self-approval of
     guard/fence/CI changes.
  3. ONE-HOME RULE. Assert that every durable fact has exactly ONE home with an owner and a
     lifecycle. Produce a table: Fact | Home (path) | Lifecycle (append / overwritten-in-place /
     deleted-at-close / amended / permanent). Then a Prohibited list: no per-release folders,
     no per-owner note files, no status-in-prose, no duplicated contract content. Name the
     single source of truth for "what is done" (the mainline branch, never hand-asserted).
  4. WORK-UNIT LIFECYCLE. Define the unit-of-work file schema (front-matter fields). Define its
     state machine (e.g. draft→ready→dispatched→review→done) and WHO may perform each transition.
     Define the "dispatch = authorization" and "path-claim lock" mechanics (two units can't claim
     overlapping files). Define a VERIFICATION TAXONOMY: a closed set of proof kinds, each with a
     mechanical pass/fail definition, and state that CI enforces the declared kind. Define closure,
     handover, and a MINIMAL-CONTEXT rule ("a session reads exactly N documents; needing an N+1th
     is a process defect — the missing fact moves to its home, prompts do not grow").
  5. ROLES. Define any coordinating role: what it owns, its DELEGATION BOUNDARY (what it may
     decide vs. what must escalate), and how it recovers from scratch holding no private state.
  6. INTEGRATION & REVIEW. Branch/PR/merge conventions; mainline-always-green + revert rights +
     stop-the-line ownership; MERGE TIERS by risk (routine auto-merge → authority-plane needs
     independent review → human acceptance), with the exact machine-checkable review record format.
     Schema-changes-merge-before-consumers rule.
  7. MECHANICAL CONTROLS. Enumerate every fence as a CI/CODEOWNERS/branch-protection mechanism,
     each phrased as "X is blocked/reconciled by Y", NOT as an instruction. Cover at minimum:
     dependency-graph allowlist, path ownership, path-claim lock, contract protection via code
     owners, obligation-coverage tripwire, conformance-as-merge-gate, work-unit hygiene,
     verification-kind enforcement, and any deployment/topology reconciliation.
  8. CONCURRENCY & MILESTONES. State the concurrency ceiling and that CONTROLS, NOT COUNTS, are
     the safety mechanism — every raise is a recorded decision citing evidence gates. Define the
     milestone/gate criteria model (a gate is only criteria + named suites + named proofs +
     coverage thresholds; creating a gate-named folder is a CI failure).
  9. DECISION BOUNDARIES & BOOTSTRAP. Two decision logs (architecture vs. process); who may
     decide each; and a bootstrap/"wave 0" section describing the minimal instantiation and the
     pilot that must exercise every control at least once (including a deliberately failing
     guard-change and a path-claim collision).

  # OUTPUT FORMAT (Markdown)
  - Header block: Title, Version, Status, Scope. State the relationship to the architecture
    contract and the conflict rule ("architecture wins").
  - Normative-keywords note (MUST / MUST NOT / SHOULD / MAY).
  - Numbered sections (## 1 … ## N) roughly following the METHOD order:
    1. Organizing units
    2. Ownership rules
    3. The one-home rule (with the Fact|Home|Lifecycle table + Prohibited list)
    4. Work-unit lifecycle (with the front-matter schema and the verification taxonomy)
    5. Coordinator / roles
    6. Branch, PR, merge, review (with merge tiers + the machine-greppable review record)
    7. Mechanical controls (a numbered list; each item is a mechanism, not an instruction)
    8. Concurrency
    9. Gates / milestones
    10. Bootstrap / wave 0 and the pilot
    11. Decision boundaries
  - Keep it terse and enumerated. Sub-items are numbered so they can be cited (e.g. §4.3).

  # STYLE RULES
  - Normative, declarative, present tense. Enumerated over prose. No aspirational language.
  - Every enforceable rule is written as a mechanism ("CI fails any PR whose changed paths
    intersect another dispatched unit's claim"), never as a plea ("please don't overlap").
  - Every durable fact named anywhere must appear in the one-home table with a lifecycle.
  - Defaults are safe and fail-closed (non-empty open-questions blocks readiness; a PR without
    a work-unit block fails; unsupported states block).
  - Cross-reference the architecture contract's invariant ids where a control defends one, but
    never restate architecture semantics.
  - Prefer "controls, not counts" and "one home per fact" — if a rule can't be mechanized,
    either attach it to a role's explicit accountability or drop it.
  - Where the TEAM_AND_CONSTRAINTS input is silent on something the process needs (e.g. who has
    final acceptance authority), add it to an "# Open questions" appendix rather than inventing it.
  - Self-consistency check before finishing: every unit in §1 is used later; every fact has one
    home; every mechanical control maps to a real fence; every merge tier has a defined trigger.