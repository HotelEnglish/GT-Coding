-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('registration_bonus', 'check_in', 'check_in_bonus', 'recharge', 'coding_consumption', 'admin_adjustment');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "MethodologyProfile" AS ENUM ('procedural');

-- CreateEnum
CREATE TYPE "AnalysisRunStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ArtifactOrigin" AS ENUM ('ai', 'researcher');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('suggested', 'accepted', 'edited', 'rejected', 'deferred');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('registration', 'password_reset');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('check_in_success', 'check_in_milestone', 'recharge_approved', 'recharge_rejected', 'low_balance_warning');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "credit_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditsAwarded" INTEGER NOT NULL,
    "bonusAwarded" INTEGER NOT NULL DEFAULT 0,
    "consecutiveDays" INTEGER NOT NULL DEFAULT 1,
    "checkInDate" TEXT NOT NULL,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recharge_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "characters" INTEGER NOT NULL,
    "qrCodeUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recharge_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recharge_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "paymentTime" TIMESTAMP(3) NOT NULL,
    "transactionLast4" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recharge_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coding_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inputTextLength" INTEGER NOT NULL,
    "creditsConsumed" INTEGER NOT NULL,
    "theory" TEXT NOT NULL,
    "depth" TEXT NOT NULL,
    "resultStored" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coding_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_projects" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "researchQuestion" TEXT,
    "methodology" "MethodologyProfile" NOT NULL DEFAULT 'procedural',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_documents" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_segments" (
    "id" TEXT NOT NULL,
    "documentVersionId" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_codes" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "definition" TEXT,
    "origin" "ArtifactOrigin" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'suggested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_assignments" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "sourceSegmentId" TEXT NOT NULL,
    "evidenceQuote" TEXT NOT NULL,
    "origin" "ArtifactOrigin" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'suggested',
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytic_memos" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "origin" "ArtifactOrigin" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'suggested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytic_memos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_relationships" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceCodeId" TEXT NOT NULL,
    "targetCodeId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "rationale" TEXT,
    "origin" "ArtifactOrigin" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'suggested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_runs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "documentVersionId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "status" "AnalysisRunStatus" NOT NULL DEFAULT 'queued',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_runs" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "requestMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_decisions" (
    "id" TEXT NOT NULL,
    "codeAssignmentId" TEXT,
    "memoId" TEXT,
    "action" "ReviewStatus" NOT NULL,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_action_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_tokenHash_idx" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_tokenHash_key" ON "admin_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_sessions_tokenHash_idx" ON "admin_sessions"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "credit_balances_userId_key" ON "credit_balances"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_transactions_transactionNumber_key" ON "credit_transactions"("transactionNumber");

-- CreateIndex
CREATE INDEX "credit_transactions_userId_createdAt_idx" ON "credit_transactions"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "credit_transactions_type_idx" ON "credit_transactions"("type");

-- CreateIndex
CREATE INDEX "check_ins_userId_checkedInAt_idx" ON "check_ins"("userId", "checkedInAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_userId_checkInDate_key" ON "check_ins"("userId", "checkInDate");

-- CreateIndex
CREATE UNIQUE INDEX "recharge_orders_orderNumber_key" ON "recharge_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "recharge_orders_userId_idx" ON "recharge_orders"("userId");

-- CreateIndex
CREATE INDEX "recharge_orders_status_idx" ON "recharge_orders"("status");

-- CreateIndex
CREATE INDEX "recharge_orders_submittedAt_idx" ON "recharge_orders"("submittedAt" DESC);

-- CreateIndex
CREATE INDEX "coding_tasks_userId_completedAt_idx" ON "coding_tasks"("userId", "completedAt" DESC);

-- CreateIndex
CREATE INDEX "research_projects_workspaceId_updatedAt_idx" ON "research_projects"("workspaceId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "source_documents_projectId_createdAt_idx" ON "source_documents"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "source_document_versions_contentHash_idx" ON "source_document_versions"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "source_document_versions_documentId_version_key" ON "source_document_versions"("documentId", "version");

-- CreateIndex
CREATE INDEX "source_segments_documentVersionId_startOffset_idx" ON "source_segments"("documentVersionId", "startOffset");

-- CreateIndex
CREATE UNIQUE INDEX "source_segments_documentVersionId_startOffset_endOffset_key" ON "source_segments"("documentVersionId", "startOffset", "endOffset");

-- CreateIndex
CREATE INDEX "research_codes_projectId_status_idx" ON "research_codes"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "research_codes_projectId_label_key" ON "research_codes"("projectId", "label");

-- CreateIndex
CREATE INDEX "code_assignments_sourceSegmentId_idx" ON "code_assignments"("sourceSegmentId");

-- CreateIndex
CREATE INDEX "code_assignments_codeId_status_idx" ON "code_assignments"("codeId", "status");

-- CreateIndex
CREATE INDEX "analytic_memos_projectId_status_idx" ON "analytic_memos"("projectId", "status");

-- CreateIndex
CREATE INDEX "category_relationships_projectId_status_idx" ON "category_relationships"("projectId", "status");

-- CreateIndex
CREATE INDEX "analysis_runs_projectId_createdAt_idx" ON "analysis_runs"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "analysis_runs_workspaceId_requestKey_key" ON "analysis_runs"("workspaceId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "model_runs_analysisRunId_key" ON "model_runs"("analysisRunId");

-- CreateIndex
CREATE INDEX "research_decisions_codeAssignmentId_createdAt_idx" ON "research_decisions"("codeAssignmentId", "createdAt");

-- CreateIndex
CREATE INDEX "research_decisions_memoId_createdAt_idx" ON "research_decisions"("memoId", "createdAt");

-- CreateIndex
CREATE INDEX "verification_codes_email_purpose_idx" ON "verification_codes"("email", "purpose");

-- CreateIndex
CREATE INDEX "admin_action_logs_adminId_idx" ON "admin_action_logs"("adminId");

-- CreateIndex
CREATE INDEX "admin_action_logs_targetType_targetId_idx" ON "admin_action_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_balances" ADD CONSTRAINT "credit_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coding_tasks" ADD CONSTRAINT "coding_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_document_versions" ADD CONSTRAINT "source_document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "source_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_segments" ADD CONSTRAINT "source_segments_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "source_document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_codes" ADD CONSTRAINT "research_codes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_assignments" ADD CONSTRAINT "code_assignments_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "research_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_assignments" ADD CONSTRAINT "code_assignments_sourceSegmentId_fkey" FOREIGN KEY ("sourceSegmentId") REFERENCES "source_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytic_memos" ADD CONSTRAINT "analytic_memos_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_relationships" ADD CONSTRAINT "category_relationships_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_relationships" ADD CONSTRAINT "category_relationships_sourceCodeId_fkey" FOREIGN KEY ("sourceCodeId") REFERENCES "research_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_relationships" ADD CONSTRAINT "category_relationships_targetCodeId_fkey" FOREIGN KEY ("targetCodeId") REFERENCES "research_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "source_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_runs" ADD CONSTRAINT "model_runs_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_decisions" ADD CONSTRAINT "research_decisions_codeAssignmentId_fkey" FOREIGN KEY ("codeAssignmentId") REFERENCES "code_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_decisions" ADD CONSTRAINT "research_decisions_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "analytic_memos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

