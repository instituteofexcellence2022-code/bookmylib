/*
  Warnings:

  - You are about to drop the column `type` on the `additional_fees` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `additional_fees` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `announcements` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedBy` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `focus_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `features` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `plans` table. All the data in the column will be lost.
  - You are about to alter the column `hoursPerDay` on the `plans` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `discountType` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `discountValue` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `refereeDiscount` on the `referrals` table. All the data in the column will be lost.
  - You are about to drop the column `referrerCouponCode` on the `referrals` table. All the data in the column will be lost.
  - You are about to drop the column `column` on the `seats` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `seats` table. All the data in the column will be lost.
  - You are about to drop the column `row` on the `seats` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `seats` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `seats` table. All the data in the column will be lost.
  - You are about to drop the column `deadline` on the `student_goals` table. All the data in the column will be lost.
  - You are about to drop the column `progress` on the `student_goals` table. All the data in the column will be lost.
  - You are about to drop the column `targetHours` on the `student_goals` table. All the data in the column will be lost.
  - You are about to drop the column `amountPaid` on the `student_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `discount` on the `student_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `finalAmount` on the `student_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `student_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `shiftId` on the `student_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `student_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `student_wallets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[couponId]` on the table `referrals` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId]` on the table `student_wallets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `announcements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `promotions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `promotions` table without a default value. This is not possible if the table is not empty.
  - Made the column `type` on table `seats` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `type` to the `student_goals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `student_subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_branchId_fkey";

-- DropForeignKey
ALTER TABLE "promotions" DROP CONSTRAINT "promotions_planId_fkey";

-- DropForeignKey
ALTER TABLE "referrals" DROP CONSTRAINT "referrals_refereeId_fkey";

-- DropForeignKey
ALTER TABLE "referrals" DROP CONSTRAINT "referrals_referrerId_fkey";

-- DropForeignKey
ALTER TABLE "support_tickets" DROP CONSTRAINT "support_tickets_branchId_fkey";

-- DropForeignKey
ALTER TABLE "support_tickets" DROP CONSTRAINT "support_tickets_staffId_fkey";

-- DropForeignKey
ALTER TABLE "support_tickets" DROP CONSTRAINT "support_tickets_studentId_fkey";

-- DropIndex
DROP INDEX "attendance_branchId_date_idx";

-- DropIndex
DROP INDEX "attendance_studentId_date_idx";

-- DropIndex
DROP INDEX "payments_invoiceNo_key";

-- DropIndex
DROP INDEX "staff_attendance_staffId_date_idx";

-- DropIndex
DROP INDEX "student_wallets_libraryId_studentId_key";

-- AlterTable
ALTER TABLE "additional_fees" DROP COLUMN "type",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "announcements" DROP COLUMN "type",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "attendance" DROP COLUMN "verifiedBy",
ADD COLUMN     "remarks" TEXT;

-- AlterTable
ALTER TABLE "focus_sessions" DROP COLUMN "rating";

-- AlterTable
ALTER TABLE "libraries" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "owners" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "handoverId" TEXT,
ADD COLUMN     "remarks" TEXT,
ALTER COLUMN "branchId" DROP NOT NULL,
ALTER COLUMN "discountAmount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "plans" DROP COLUMN "features",
DROP COLUMN "type",
ALTER COLUMN "durationUnit" DROP DEFAULT,
ALTER COLUMN "category" DROP DEFAULT,
ALTER COLUMN "billingCycle" DROP DEFAULT,
ALTER COLUMN "hoursPerDay" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "promotions" DROP COLUMN "discountType",
DROP COLUMN "discountValue",
DROP COLUMN "updatedAt",
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "value" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL,
ALTER COLUMN "endDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "referrals" DROP COLUMN "refereeDiscount",
DROP COLUMN "referrerCouponCode",
ADD COLUMN     "codeUsed" TEXT,
ADD COLUMN     "couponId" TEXT,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "seats" DROP COLUMN "column",
DROP COLUMN "createdAt",
DROP COLUMN "row",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "type" SET NOT NULL;

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "staff_attendance" ADD COLUMN     "remarks" TEXT;

-- AlterTable
ALTER TABLE "student_goals" DROP COLUMN "deadline",
DROP COLUMN "progress",
DROP COLUMN "targetHours",
ADD COLUMN     "targetDate" TIMESTAMP(3),
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "student_notes" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "student_subscriptions" DROP COLUMN "amountPaid",
DROP COLUMN "discount",
DROP COLUMN "finalAmount",
DROP COLUMN "paymentStatus",
DROP COLUMN "shiftId",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "student_wallets" DROP COLUMN "currency",
DROP COLUMN "status",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "course" TEXT,
ADD COLUMN     "govtIdType" TEXT,
ADD COLUMN     "guardianRelation" TEXT,
ADD COLUMN     "institution" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "preferences" JSONB,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "ticket_comments" ADD COLUMN     "attachmentUrl" TEXT;

-- AlterTable
ALTER TABLE "wallet_transactions" ALTER COLUMN "reason" DROP NOT NULL;

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_interactions" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_handovers" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'cash',
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_email_token_key" ON "password_reset_tokens"("email", "token");

-- CreateIndex
CREATE INDEX "payments_libraryId_idx" ON "payments"("libraryId");

-- CreateIndex
CREATE INDEX "payments_branchId_idx" ON "payments"("branchId");

-- CreateIndex
CREATE INDEX "payments_studentId_idx" ON "payments"("studentId");

-- CreateIndex
CREATE INDEX "payments_date_idx" ON "payments"("date");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_couponId_key" ON "referrals"("couponId");

-- CreateIndex
CREATE INDEX "seats_libraryId_idx" ON "seats"("libraryId");

-- CreateIndex
CREATE INDEX "seats_branchId_idx" ON "seats"("branchId");

-- CreateIndex
CREATE INDEX "student_subscriptions_libraryId_idx" ON "student_subscriptions"("libraryId");

-- CreateIndex
CREATE INDEX "student_subscriptions_branchId_idx" ON "student_subscriptions"("branchId");

-- CreateIndex
CREATE INDEX "student_subscriptions_studentId_idx" ON "student_subscriptions"("studentId");

-- CreateIndex
CREATE INDEX "student_subscriptions_status_idx" ON "student_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "student_wallets_studentId_key" ON "student_wallets"("studentId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "cash_handovers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_interactions" ADD CONSTRAINT "lead_interactions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_interactions" ADD CONSTRAINT "lead_interactions_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
