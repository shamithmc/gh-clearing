# XML Contract Classification and Provenance

This directory contains two application-owned XML contracts:

- `is-invoice.xsd` uses the legacy `urn:iata:is:invoice:1.0` namespace.
- `is-credit-note.xsd` uses `urn:ghcm:credit-note:1.0`.

Both schemas provide deterministic validation for GHCP invoice and credit-note
exports. Neither file is an official, licensed, or IATA-validated IS-XML
artifact. The legacy invoice namespace and filenames are compatibility
identifiers only and are not evidence of standards conformance.

## Provenance

`is-invoice.provenance.json` classifies the invoice schema as
`application_owned`, records its repository source, and pins its SHA-256 digest.
The governance validator rejects an application-owned artifact that identifies
IATA as its owner or claims official status without licensed-official metadata.

## Validation level

Generated documents are validated against these local contracts before storage
and dispatch. This proves internal structure and required-field consistency; it
does not prove IATA IS-XML, SIS, IS P3, or clearing-house compatibility.

## External blocker

Official conformance remains unavailable until an independently verified,
licensed schema and envelope specification are supplied with usage authority and
reviewable provenance. When that happens, the official artifact must be added
through a separately approved contract/conformance change and the generators
must be mapped and tested against it before any official claim is restored.
Until then, local-contract validation and dispatch do not satisfy architecture
invariant INV-09's official-schema requirement.
