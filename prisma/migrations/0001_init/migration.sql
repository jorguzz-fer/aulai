-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('AGUARDANDO_GERACAO', 'EM_PRODUCAO', 'AGUARDANDO_APROVACAO', 'AJUSTE_PEDIDO', 'APROVADO', 'AGENDADO', 'PUBLICADO');

-- CreateEnum
CREATE TYPE "Gate" AS ENUM ('COURSE');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('SCREEN', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('WHATSAPP', 'MANUAL');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'RENDERING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'TEAM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TEAM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "audience" TEXT,
    "promise" TEXT,
    "prerequisite" TEXT,
    "expectedResult" TEXT,
    "format" TEXT,
    "complianceNotes" TEXT,
    "source" "Source" NOT NULL DEFAULT 'WHATSAPP',
    "stage" "Stage" NOT NULL DEFAULT 'AGUARDANDO_GERACAO',
    "thumbnailUrl" TEXT,
    "externalRef" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "supportMaterials" TEXT,
    "links" JSONB,
    "thumbnailUrl" TEXT,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "objective" TEXT,
    "script" TEXT,
    "exercise" TEXT,
    "videoUrl" TEXT,
    "heygenRef" TEXT,
    "videoStatus" "AssetStatus" NOT NULL DEFAULT 'PENDING',
    "thumbnailUrl" TEXT,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalEvent" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "gate" "Gate" NOT NULL,
    "decision" "Decision" NOT NULL,
    "channel" "Channel" NOT NULL DEFAULT 'SCREEN',
    "actorUserId" TEXT,
    "actorName" TEXT NOT NULL,
    "comment" TEXT,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Course_stage_archived_idx" ON "Course"("stage", "archived");

-- CreateIndex
CREATE INDEX "Module_courseId_order_idx" ON "Module"("courseId", "order");

-- CreateIndex
CREATE INDEX "Lesson_moduleId_order_idx" ON "Lesson"("moduleId", "order");

-- CreateIndex
CREATE INDEX "ApprovalEvent_courseId_createdAt_idx" ON "ApprovalEvent"("courseId", "createdAt");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEvent" ADD CONSTRAINT "ApprovalEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

