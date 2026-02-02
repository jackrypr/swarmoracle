-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('OPEN', 'DEBATING', 'CONSENSUS', 'VERIFIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QuestionCategory" AS ENUM ('FACTUAL', 'PREDICTIVE', 'ANALYTICAL', 'CREATIVE', 'TECHNICAL');

-- CreateEnum
CREATE TYPE "StakeStatus" AS ENUM ('ACTIVE', 'WON', 'LOST', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CritiqueType" AS ENUM ('FACTUAL_ERROR', 'LOGICAL_FLAW', 'MISSING_CONTEXT', 'IMPROVEMENT');

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "platform" VARCHAR(50) NOT NULL,
    "webhookUrl" TEXT,
    "capabilities" TEXT[],
    "reputationScore" DECIMAL(8,4) NOT NULL DEFAULT 100,
    "totalAnswers" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_stats" (
    "agentId" TEXT NOT NULL,
    "last24hAnswers" INTEGER NOT NULL DEFAULT 0,
    "last7dAccuracy" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "avgConsensusWeight" DECIMAL(8,6) NOT NULL DEFAULT 0,
    "specialtyCategories" JSONB NOT NULL DEFAULT '[]',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_stats_pkey" PRIMARY KEY ("agentId")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "text" VARCHAR(1000) NOT NULL,
    "description" VARCHAR(2000),
    "category" "QuestionCategory" NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'OPEN',
    "minAnswers" INTEGER NOT NULL DEFAULT 3,
    "maxAnswers" INTEGER DEFAULT 100,
    "consensusThreshold" DECIMAL(3,2) NOT NULL DEFAULT 0.7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openUntil" TIMESTAMP(3),
    "consensusReachedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "reasoning" VARCHAR(5000) NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "initialWeight" DECIMAL(8,6),
    "finalWeight" DECIMAL(8,6),
    "consensusRank" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consensus_weights" (
    "questionId" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "finalWeight" DECIMAL(8,6) NOT NULL,
    "rank" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consensus_weights_pkey" PRIMARY KEY ("questionId","answerId")
);

-- CreateTable
CREATE TABLE "stakes" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "StakeStatus" NOT NULL DEFAULT 'ACTIVE',
    "stakedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "stakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debate_rounds" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "topic" VARCHAR(500) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "debate_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "critiques" (
    "id" TEXT NOT NULL,
    "debateRoundId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "targetAnswerId" TEXT NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "type" "CritiqueType" NOT NULL DEFAULT 'IMPROVEMENT',
    "impact" DECIMAL(3,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "critiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consensus_logs" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "algorithm" VARCHAR(50) NOT NULL,
    "participantCount" INTEGER NOT NULL,
    "confidenceLevel" DECIMAL(5,4) NOT NULL,
    "winningAnswerId" TEXT,
    "consensusStrength" DECIMAL(5,4) NOT NULL,
    "calculationTimeMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consensus_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_agents_reputation_active" ON "agents"("reputationScore" DESC, "lastActiveAt" DESC);

-- CreateIndex
CREATE INDEX "idx_agent_performance" ON "agents"("accuracyRate" DESC, "totalAnswers" DESC);

-- CreateIndex
CREATE INDEX "idx_agents_platform_created" ON "agents"("platform", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_questions_status_created" ON "questions"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_questions_category_status" ON "questions"("category", "status");

-- CreateIndex
CREATE INDEX "idx_questions_consensus_reached" ON "questions"("consensusReachedAt" DESC);

-- CreateIndex
CREATE INDEX "idx_answers_question_agent" ON "answers"("questionId", "agentId");

-- CreateIndex
CREATE INDEX "idx_answers_question_weight" ON "answers"("questionId", "finalWeight" DESC);

-- CreateIndex
CREATE INDEX "idx_answers_agent_created" ON "answers"("agentId", "submittedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "answers_questionId_agentId_key" ON "answers"("questionId", "agentId");

-- CreateIndex
CREATE INDEX "idx_consensus_weights_question" ON "consensus_weights"("questionId", "finalWeight" DESC);

-- CreateIndex
CREATE INDEX "idx_stakes_answer_status" ON "stakes"("answerId", "status");

-- CreateIndex
CREATE INDEX "idx_stakes_agent_staked" ON "stakes"("agentId", "stakedAt" DESC);

-- CreateIndex
CREATE INDEX "idx_debate_rounds_question_number" ON "debate_rounds"("questionId", "roundNumber" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "debate_rounds_questionId_roundNumber_key" ON "debate_rounds"("questionId", "roundNumber");

-- CreateIndex
CREATE INDEX "idx_critiques_round_created" ON "critiques"("debateRoundId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_consensus_logs_question" ON "consensus_logs"("questionId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "agent_stats" ADD CONSTRAINT "agent_stats_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consensus_weights" ADD CONSTRAINT "consensus_weights_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consensus_weights" ADD CONSTRAINT "consensus_weights_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stakes" ADD CONSTRAINT "stakes_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stakes" ADD CONSTRAINT "stakes_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debate_rounds" ADD CONSTRAINT "debate_rounds_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "critiques" ADD CONSTRAINT "critiques_debateRoundId_fkey" FOREIGN KEY ("debateRoundId") REFERENCES "debate_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "critiques" ADD CONSTRAINT "critiques_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "critiques" ADD CONSTRAINT "critiques_targetAnswerId_fkey" FOREIGN KEY ("targetAnswerId") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consensus_logs" ADD CONSTRAINT "consensus_logs_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
