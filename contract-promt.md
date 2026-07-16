# ROLE
  You are a systems architect writing a CANONICAL ARCHITECTURE CONTRACT — a normative,
  long-lived document that defines WHAT a system is and the invariants it must never
  violate. This is not a design doc, roadmap, or tutorial. It constrains all future
  implementations: a release may implement only part of it, but MUST NOT contradict it,
  introduce an alternate authority, or claim a guarantee it has not implemented.

  # INPUTS
   prd.md
   design.md

  # METHOD (do this reasoning before writing)
  1. Extract the system's ONE-SENTENCE purpose and its single hardest boundary
     ("X owns ___; everything else is a replaceable consumer of ___").
  2. Identify the KERNEL: the smallest set of semantic primitives (aim for 5–8) that
     everything else is defined in terms of. Name each with a noun and a one-line role.
  3. Derive a set of memorable LAWS — compressed invariable guarantees stated as logical
     properties, not implementation choices ("one X per Y", "every A is a policy-shaped B").
     Distinguish logical guarantees from implementation freedoms explicitly.
  4. Group the primitives into a few COMPOSITIONAL CONTRACTS (major subsystems). Everything
     else — identity, policy, deployment, etc. — is a *section within* one of these, never a
     parallel platform.
  5. For every enumerable set of choices, make it a CLOSED, VERSIONED VOCABULARY: list the
     allowed values, state that unsupported values FAIL CLOSED rather than silently degrade,
     and state that the list widens only by explicit amendment.
  6. Define PRECEDENCE wherever rules can conflict (e.g. prohibition > deny > require > permit
     > default-deny). Make defaults safe (default-deny / fail-closed).
  7. Extract the NON-NEGOTIABLE INVARIANTS: the properties that, if violated, mean the system
     is no longer itself. Each gets a stable id (INV-01…), a bold short name, and ONE sentence.
  8. State the NON-GOALS / boundaries: what this system is explicitly NOT, and where it defers
     to specialist systems.

  # OUTPUT FORMAT (Markdown)
  - Header block: Title, Version, Status, Scope.
  - A normative-keywords note: define MUST / MUST NOT / REQUIRED / SHOULD / SHOULD NOT / MAY
    (RFC-2119 style) and state the "implement-part-but-never-contradict" rule.
  - Numbered sections (# 1, # 2, …), in this order:
    1. Purpose  (the one-sentence essence + the canonical interaction cycle if there is one)
    2. Kernel and laws  (the primitives, the laws, the compositional contracts)
    3–N. One section per compositional contract, each with numbered subsections (2.1, 2.2…),
         each stating obligations in MUST/SHOULD/MAY terms and defining its closed vocabularies.
    Second-to-last. Non-negotiable invariants — a flat INV-01…INV-nn list, each `**INV-nn — Name.**
    one-sentence guarantee.`
    Last. End-state summary — one paragraph restating the whole system, ending with the single
    hardest boundary as a block-quote.

  # STYLE RULES
  - Normative and declarative. Present tense. No roadmap language, no "we will", no examples
    unless they define a term. No marketing.
  - Every closed set is stated as closed and versioned. Every default is safe.
  - Prefer "logical guarantee, not a requirement for one database/process/region."
  - Each invariant is independently testable and traces back to a section obligation.
  - Do not invent requirements absent from the PRD/design; where the inputs are silent on a
    property the kernel needs, add it to an "# Open questions" appendix rather than guessing.
  - Keep it self-consistent: every primitive named in the kernel appears in a contract section
    and is defended by at least one invariant.

  A few notes on tuning it:

  - This generates the "WHAT" (architecture) contract. To also produce the companion "HOW" (development operating) contract in this repo, run a second pass with a prompt whose sections are: Organizing units →
  Ownership rules → One-home rule (a fact→home→lifecycle table) → Work-unit lifecycle → Roles → Mechanical controls (CI-enforced, not instructions) → Concurrency → Milestones/Gates. Key instruction to carry
  over: "every rule that can be mechanically enforced MUST be expressed as a CI/branch-protection control, not as a request for good behavior." That's what turns prose into fences.
  - The invariant list is the highest-value output and also where models get lazy — they'll write 6 vague ones. If you want the INV-01…INV-29 density your contract has, add: "Produce at least one invariant per
  compositional-contract subsection; each must name a concrete failure it forbids."
  - The closed-vocabulary discipline (permit|deny|require, native|external|derived|unowned, etc.) is the other thing that makes these contracts feel rigorous rather than aspirational. The prompt forces it, but
  on a thin PRD the model may not have enough material — that's fine, the "Open questions" appendix is where the gaps surface, which is genuinely useful signal.