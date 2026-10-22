# Auditable Grounded Theory Workbench Implementation Plan

> **状态：** 本方案（v1）已被 `2026-10-22-auditable-gt-workbench-v2.md` 取代。
> v1 架构方向与领域不变量保留；v2 依据代码库实际核查结果重排了任务顺序
> （工作台后端已部分实现、测试/迁移缺失、运行模式改为进程内异步、新增遗留端点停用与 Casdoor 选型）。

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace one-shot browser-based coding with a single-researcher, evidence-traceable procedural grounded-theory MVP without losing legacy results.

**Architecture:** Keep the React/Vite frontend, Express API, Prisma, and PostgreSQL. Add workspace-scoped source versions, evidence references, AI runs, researcher decisions, and an asynchronous analysis-run state machine. The backend owns model calls; the functional MVP has no account, billing, credit, or payment dependency.

**Tech Stack:** React 19, TypeScript, Vite, Express 4, Prisma 6, PostgreSQL; add Vitest, Supertest, Zod, and a provider SDK or a thin `fetch` adapter only during implementation.

---

## Scope and non-goals

### In scope

- One procedural (Strauss-Corbin) project profile.
- Text-document versions, deterministic segments, evidence-backed code suggestions, researcher decisions, memos, and category-relation hypotheses.
- Server-owned AI invocation, idempotent task processing, audit export, and legacy-result read-only access.

### Explicitly out of scope

- Classical and constructivist production workflows.
- Automated declarations of theoretical saturation.
- Audio transcription, collaboration, graph rendering, expert-video rule extraction, accounts, membership, credits, payments automation, and model-provider self-service keys.

## Product and operational decisions required before a real-provider pilot

1. Select the provider/data boundary: managed provider with a written data-processing agreement, an approved regional provider, or a self-hosted model. No participant text is sent before this is selected.
2. Set a retention policy and backup RPO/RTO appropriate to the pilot.
3. Nominate at least two grounded-theory reviewers and approve a de-identified pilot corpus.

## Target data flow

```text
ResearchProject → SourceDocument → SourceDocumentVersion → SourceSegment
                                                    ↓
Browser → POST analysis-runs → queued run → provider adapter → validated candidate output
                                                    ↓
           ResearchDecision ← CodeAssignment / Memo / CategoryRelationship ← evidence offsets
                                                    ↓
                                  audit export + model-run record
```

## Domain invariants

- A source version is immutable; edits create a new version.
- Each quoted evidence item has `documentVersionId`, `startOffset`, `endOffset`, `quoteText`, and SHA-256 content hash; server verification must prove quote equality before persistence.
- AI output is a `suggested` artefact until a researcher records accept, edit, reject, or defer.
- Research decisions append events; current UI state is a projection, never an overwrite of historic evidence.
- A request idempotency key maps to exactly one analysis run.
- A run is terminal as `completed`, `failed`, or `cancelled`; no MVP transition changes a user's credit balance.
- “Saturation” is a researcher-authored evidence assessment, never a calculated percentage or automatic pass/fail claim.

## API contract (MVP)

| Endpoint | Contract |
|---|---|
| `POST /api/projects` | Creates a local-workspace project with methodology profile `procedural`. |
| `POST /api/projects/:id/documents` | Creates a document and immutable initial version. |
| `POST /api/document-versions/:id/segments` | Creates deterministic, non-overlapping text segments; response exposes offsets and hashes. |
| `POST /api/projects/:id/analysis-runs` | Requires `Idempotency-Key`; validates local-workspace ownership and source-version IDs; creates `queued` run only. |
| `GET /api/analysis-runs/:id` | Returns run state, progress, model metadata, and suggested/confirmed distinction; never provider secret or raw prompt secret fields. |
| `POST /api/code-assignments/:id/decisions` | Appends accept/edit/reject/defer event; edit preserves source suggestion. |
| `POST /api/memos` | Adds a human or AI-draft memo linked to project artefacts. |
| `GET /api/projects/:id/audit-export` | Exports project metadata, versions, evidence, decisions, model-run metadata, and integrity warnings. |

## Task 1: Establish a testable baseline

**Files:**
- Modify: `package.json`
- Modify: `server/package.json`
- Create: `src/**/*.test.tsx`
- Create: `server/src/**/*.test.ts`
- Create: `server/vitest.config.ts`

1. Add Vitest and React Testing Library for client tests; add Vitest, Supertest, and a disposable PostgreSQL test-database strategy for server tests.
2. Write a failing route test asserting `POST /api/projects` creates an isolated local-workspace project and does not invoke existing auth middleware.
3. Write a failing component test asserting the legacy coding page remains viewable but labels its output as a legacy snapshot.
4. Implement only enough test bootstrapping to run the tests.
5. Run client typecheck, server typecheck, client tests, server tests, and record commands in `README.md`.
6. Commit: `test: establish client and server verification baseline`.

## Task 2: Make the current data model reproducible

**Files:**
- Modify: `.gitignore`
- Create: `server/prisma/migrations/<timestamp>_baseline/migration.sql`
- Modify: `server/prisma/schema.prisma`
- Modify: `DEPLOYMENT_GUIDE.md`

1. Write a migration-validation test that applies migrations to an empty test database.
2. Establish an initial committed migration from the current Prisma schema. Stop if the existing production schema differs; capture a backup and write a reconciliation migration instead.
3. Remove the rule that ignores `server/prisma/migrations/`.
4. Update deployment instructions to use production-safe `prisma migrate deploy`; never instruct users to delete a database to fix a uniqueness error.
5. Run migration validation and existing service tests.
6. Commit: `chore: version prisma schema migrations`.

## Task 3: Add the project and provenance schema

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/<timestamp>_research_provenance/migration.sql`
- Create: `server/src/services/provenanceService.ts`
- Create: `server/src/services/provenanceService.test.ts`

1. Write failing tests for immutable document versions, non-overlapping segments, evidence quote validation, and append-only decisions.
2. Add `ResearchProject`, `ProjectMember`, `SourceDocument`, `SourceDocumentVersion`, `SourceSegment`, `Code`, `CodeAssignment`, `AnalyticMemo`, `CategoryRelationship`, `ResearchDecision`, `AnalysisRun`, and `ModelRun`.
3. Use foreign keys, project-scoped indexes, `createdAt`, `createdById`, `origin` (`ai`/`researcher`), and explicit lifecycle enums. Use JSONB only for provider payload snapshots and structured draft metadata.
4. Implement segment normalization and server-side offset/hash validation; reject invalid quotes with 422.
5. Run migration, provenance tests, and a schema integrity check.
6. Commit: `feat: add research evidence provenance model`.

## Task 4: Add project-scoped authorization and document APIs

**Files:**
- Create: `server/src/controllers/projectController.ts`
- Create: `server/src/controllers/documentController.ts`
- Create: `server/src/routes/projectRoutes.ts`
- Create: `server/src/middleware/projectRoleMiddleware.ts`
- Modify: `server/src/index.ts`
- Create: corresponding route tests

1. Write failing tests for local-workspace isolation, cross-project object access 404, and document-version immutability.
2. Implement a temporary local workspace identifier; defer owner/editor/viewer roles until account work resumes.
3. Implement project and text-document creation with body-size limits and a content type allowlist.
4. Implement deterministic segment creation using a documented UTF-16 offset contract.
5. Add structured request logs with project/run IDs but never raw interview text.
6. Run route tests and commit: `feat: add local research projects and documents`.

## Task 5: Replace mock coding with a server-owned, idempotent run service

**Files:**
- Create: `server/src/services/ai/aiProvider.ts`
- Create: `server/src/services/ai/providerFactory.ts`
- Create: `server/src/services/analysisRunService.ts`
- Create: `server/src/schemas/analysisOutput.ts`
- Modify: `server/src/controllers/codingController.ts`
- Modify: `server/src/routes/codingRoutes.ts`
- Create: corresponding unit and integration tests

1. Write failing tests for idempotent repeated submissions, provider timeout, malformed structured output, and evidence not present in source.
2. Define a provider interface returning normalized text, usage, model identifier, request ID, and timing. Load provider credentials only from server environment variables.
3. Use Zod to validate candidate initial codes, evidence offsets, memo drafts, and relation hypotheses before persistence.
4. Replace `performCodingAnalysis` mock output with a queued→running→completed/failed state machine. The MVP never calls credit services.
5. Keep run-state persistence transactionally consistent; add billing integration only after a usability pilot and the account-system rebuild.
6. Persist provider/model/prompt-template version, token usage, errors, and redacted request metadata in `ModelRun`.
7. Run integration tests and commit: `feat: add auditable server analysis runs`.

## Task 6: Build the researcher review vertical slice

**Files:**
- Create: `src/utils/projectApi.ts`
- Create: `src/components/workbench/ProjectWorkspace.tsx`
- Create: `src/components/workbench/EvidenceReview.tsx`
- Create: `src/components/workbench/DecisionControls.tsx`
- Create: `src/components/workbench/MemoPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/types/index.ts`
- Create: component tests

1. Write failing tests proving a suggestion is visibly marked AI-generated, can be accepted/edited/rejected/deferred, and retains its original AI text after edit.
2. Implement a three-column review surface: immutable source text, linked code assignments, and AI suggestions/decision controls.
3. Display exact evidence highlight offsets and a version label; never let a user approve a suggestion whose evidence validation failed.
4. Add human Memo creation and AI-draft Memo acceptance as separate actions.
5. Keep `CodingModule` and `ResultPanel` available only as a clearly labelled legacy-snapshot flow until migration is complete.
6. Run browser/component tests and commit: `feat: add researcher evidence review workbench`.

## Task 7: Audit export, legacy compatibility, and saturation evidence

**Files:**
- Create: `server/src/services/auditExportService.ts`
- Create: `server/src/controllers/auditController.ts`
- Create: `src/components/workbench/AuditExportPanel.tsx`
- Modify: `src/components/coding/ResultPanel.tsx`
- Create: export and UI tests

1. Write failing tests that export includes source versions, evidence offsets, decisions, model metadata, and omission warnings for legacy snapshots.
2. Implement JSON and CSV audit exports with local-workspace checks and download audit events.
3. Replace percentage saturation output with a researcher-authored assessment containing scope, evidence coverage, unresolved questions, counterexamples, decision, and rationale.
4. Mark historic trees “legacy: provenance incomplete”; never synthesize missing audit records.
5. Run export/UI tests and commit: `feat: export auditable research records`.

## Task 8: Validation gate before expansion

**Files:**
- Create: `docs/validation/protocol.md`
- Create: `docs/validation/pilot-scorecard.csv`
- Modify: `README.md`

1. Define a de-identification checklist and consent/provider approval gate.
2. Create a blinded reviewer protocol for evidence accuracy, code distinction, counterexample handling, AI/researcher attribution, and modification effort. Do not define a single “correct coding tree.”
3. Run the pilot on approved de-identified data; log defects without uploading material to issue trackers.
4. Require: zero invalid evidence links, successful replay/idempotency tests, successful export re-import verification, and reviewer approval before adding another methodology profile.
5. Commit: `docs: define auditable GT MVP validation gate`.

## Release criteria

- A researcher can identify every accepted claim's exact source version and offsets.
- AI suggestions and researcher decisions are never conflated.
- Provider failures create a failed run; retries with the same idempotency key do not create duplicate analysis runs.
- Local-workspace requests cannot fetch another workspace's project, document, run, or export.
- No screen reports a numeric or automated claim of theoretical saturation.
- The pilot reviewers can inspect the complete audit export without access to provider secrets.

