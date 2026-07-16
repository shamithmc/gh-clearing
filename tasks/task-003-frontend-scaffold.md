---
id: TASK-003
title: "Scaffold frontend React Vite application"
owner: unassigned
paths:
  - "package.json"
  - "vite.config.ts"
proof: COMPILER
invariants:
  - INV-02
---

# TASK-003: Frontend Scaffolding

This task establishes the React + TypeScript + Vite frontend scaffolding.

## Steps

1. **Scaffold Package Files**:
   * Create `package.json` with dependencies allowlisted in `dependency-allowlist.json` (React, Ant Design, TypeScript, Axios, Vite).
   * Ensure devDependencies are declared correctly.

2. **Configure Vite**:
   * Create `vite.config.ts` configuring the development server port, proxy mapping, and Ant Design styling configuration.

3. **Verify Build**:
   * Run `npm install` and `npm run build` or the TypeScript compiler checks to verify the `COMPILER` proof kind passes without warnings.
