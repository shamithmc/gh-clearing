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

### Official upstream reference

The official invoice schema is published by IATA as
[IATA IS-XML Invoice Standard V4.4.0.0](https://www.iata.org/globalassets/iata/services/financial-services/sis/IATA_IS_XML_Invoice_Standard_V4.4.0.0.xsd).
It was verified on 2026-08-14 as a 238,789-byte XML document with SHA-256
`34b86e3ef4c2fd3e1beec7cd6f2587513519c97f8c9db0f47d102b44375ccb45`.

This upstream reference is not the bundled `is-invoice.xsd`. The official file's
copyright header prohibits reproduction or transmission without IATA's express
prior written permission, so it is referenced but not copied into this repository.
It also imports the official Base Datatypes and Main Dictionary v4.4.0.0 schemas,
which must be acquired with the same verified authority before offline validation.

## Validation level

Generated documents are validated against these local contracts before storage
and dispatch. This proves internal structure and required-field consistency; it
does not prove IATA IS-XML, SIS, IS P3, or clearing-house compatibility.

## External blocker

Official conformance remains unavailable until written usage/redistribution
authority and the complete imported schema set are supplied with reviewable
provenance. When that happens, the official artifacts must be added
through a separately approved contract/conformance change and the generators
must be mapped and tested against it before any official claim is restored.
Until then, local-contract validation and dispatch do not satisfy architecture
invariant INV-09's official-schema requirement.
