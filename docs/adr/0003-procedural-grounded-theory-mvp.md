# ADR-0003: Start the auditable MVP with the Strauss-Corbin procedural profile

## Status

Accepted for the functional MVP

## Context

The application displays classical, procedural, and constructivist grounded-theory labels, but all three currently share one three-level output tree. Delivering all three as independent, methodologically credible workflows would delay validation of the core evidence and decision model.

## Decision

The first auditable workflow will support a clearly labelled Strauss-Corbin procedural profile: initial coding suggestions, researcher-confirmed code assignments, category development, condition/action/consequence relation hypotheses, and analytic memos. The interface will describe these as suggestions and researcher decisions, not automatically discovered theory.

The shared evidence, decision, and memo primitives will be profile-neutral. Classical and constructivist profiles are deferred until their artefacts, permitted transitions, and expert review criteria are separately specified.

## Consequences

### Positive

- The MVP has an explicit, testable set of artefacts.
- Structured category relationships provide an approachable first validation surface.
- Shared infrastructure is reusable by later profiles.

### Negative

- Users of the other approaches cannot claim full workflow support in the first release.
- The original universal three-level result UI must become a legacy-result view rather than an MVP data model.

## Alternatives Considered

- **Ship all three profiles at once:** rejected because it confuses data-model validation with methodology implementation.
- **Start with a paradigm-neutral generic coding workflow:** rejected because it risks recreating the existing one-tree-for-all limitation.

