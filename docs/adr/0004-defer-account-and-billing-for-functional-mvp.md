# ADR-0004: Defer account, membership, and billing from the functional MVP

## Status

Accepted

## Context

The existing account, credit, recharge, and administration modules are unfinished and disconnected from the browser's actual model calls. The immediate goal is to validate whether the research-workbench workflow is useful, not to operate a paid multi-user service.

## Decision

The functional MVP is a single-researcher local/development workflow. It will not require login, membership, credits, payments, project-member roles, or administrative screens. The workbench owns projects through a temporary local workspace identity; its APIs remain separate from the current user and credit APIs.

AI calls still move server-side. Provider credentials are supplied only through server environment configuration. Development and automated tests use an injected fake provider; no participant data may be sent to a provider until the product owner selects and configures an approved data-processing boundary.

## Consequences

### Positive

- Development validates the research workflow without waiting for account-system completion.
- No billing defect can block or distort the usability pilot.
- Future authentication can be added at project-ownership boundaries instead of being threaded through coding UI state.

### Negative

- The MVP is not a deployable multi-user service and must not be advertised as one.
- API routes are development-local until authorization is added.

## Alternatives Considered

- **Finish the membership system first:** rejected because it does not validate the core research value proposition.
- **Keep browser-owned model keys:** rejected because it prevents a unified run and provenance record.

