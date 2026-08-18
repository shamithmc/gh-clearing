---
id: TASK-074
title: "Update Product Guide for Formula Authoring and Entity Editing"
owner: Shamith
state: REVIEW
paths:
  - "docs/product-guide/README.md"
  - "docs/product-guide/airline-guide.md"
  - "docs/product-guide/feature-availability.md"
  - "docs/product-guide/getting-started.md"
  - "docs/product-guide/ground-handler-guide.md"
  - "docs/product-guide/marketplace-and-rfps.md"
  - "docs/product-guide/roles-and-access.md"
  - "tasks/task-product-guide-updates.md"
proof: UNIT
invariants:
  - INV-12
---

## Scope

1. **Update Product Guide for Dynamic Formula Authoring UI**:
   - Document dedicated interactive sub-editors for all 7 pricing formulas (PF-01 through PF-07) and Formula Review Cards in Step 3.
2. **Update Product Guide for Comprehensive Entity Editing**:
   - SGHA Contract editing (`/contracts/:id/edit`) for `DRAFT` and `REVIEW_REQUESTED` contracts.
   - Invoice editing (`/invoices/:id/edit`) for `DRAFT` and `MODIFICATION_REQUESTED` invoices.
   - Service offering updates, proposal/bid revisions, airline RFP edits, and tenant organization editing.
3. **Update Product Guide for Platform Administration**:
   - Document Platform Admin workspace, Tenant Management, and User & Role Administration with multi-tenant ABAC scoping.
