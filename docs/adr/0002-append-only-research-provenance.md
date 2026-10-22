# ADR-0002: Store research provenance as immutable evidence and decision events

## Status

Proposed

## Context

A final coding tree cannot show which document version supported a code, what the AI suggested, or how a researcher accepted, changed, rejected, or superseded it. Editable rows alone lose the history needed for an auditable research process.

## Decision

Use PostgreSQL as the source of truth. Store source-document versions and normalized source segments. Persist current-domain objects (`Code`, `CodeAssignment`, `AnalyticMemo`, and `CategoryRelationship`) together with an append-only `ResearchDecision` event stream. Each evidence reference contains a document-version identifier, UTF-16 character offsets, an exact quote snapshot, and a content hash.

The first MVP will use relational tables plus JSONB only for provider payload snapshots. It will not introduce a graph database or generic event-sourcing framework.

## Consequences

### Positive

- A claim can be reproduced against a stable source version.
- Researcher and AI contributions remain distinguishable.
- The existing PostgreSQL/Prisma stack remains sufficient and transactional.

### Negative

- More tables and migrations are required before feature work.
- Domain-object projections must be maintained when a decision event is appended.

## Alternatives Considered

- **Store one mutable JSON coding tree:** rejected because it cannot retain decision history or evidence-level provenance.
- **Adopt Neo4j now:** rejected because relational integrity, access control, transactions, and the current team stack matter more than graph traversal for the MVP.

