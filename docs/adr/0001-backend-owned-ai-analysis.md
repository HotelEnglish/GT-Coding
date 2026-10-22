# ADR-0001: Route production AI analysis through the backend

## Status

Proposed

## Context

The current browser sends the API key, interview text, reference summaries, and prompts directly to model providers. The authenticated backend exposes a separate coding endpoint, but it returns mock data and is not used by the browser. This makes credits, provider usage, task status, retention rules, and research audit records impossible to reconcile.

## Decision

All production analysis requests will use an authenticated backend API. A server-side `AiProvider` adapter will own provider credentials, timeouts, retries, normalized errors, structured-output validation, and usage capture. The browser will submit project-scoped work only; it will never submit a provider key.

Bring-your-own-key mode, if retained, is explicitly a separate local-only mode: it has no credits, no server audit guarantee, and may not be presented as an auditable research run.

## Consequences

### Positive

- One authoritative run record can join user, project, input version, model configuration, output, cost, and credit transaction.
- Sensitive data handling and provider policy are controlled centrally.
- A provider can be changed without changing the coding UI.

### Negative

- The service now needs secure provider-secret management and an outbound-provider policy.
- The existing browser settings page cannot remain the production model configuration surface.

## Alternatives Considered

- **Keep direct browser calls:** rejected because it bypasses billing and auditability.
- **Proxy arbitrary user-supplied API keys:** rejected for the MVP because it broadens secret-handling and abuse risk.

