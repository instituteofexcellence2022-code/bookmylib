/*
  Warnings:

  - You are about to drop the column `maxStudents` on the `saas_plans` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `saas_payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `saas_payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "platform_users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "preferences" JSONB;

-- AlterTable
ALTER TABLE "saas_payments" ADD COLUMN     "billingEnd" TIMESTAMP(3),
ADD COLUMN     "billingStart" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "method" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "planId" TEXT,
ADD COLUMN     "subtotal" DOUBLE PRECISION,
ADD COLUMN     "taxAmount" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "saas_plans" DROP COLUMN "maxStudents",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isPopular" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxActiveStudents" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "maxEmailsMonthly" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "maxSeats" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "maxSmsMonthly" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "maxTotalStudents" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trialDays" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "platform_ticket_responses" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_ticket_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "platformName" TEXT NOT NULL DEFAULT 'Library SaaS',
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "logo" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMsg" TEXT,
    "enableRegistrations" BOOLEAN NOT NULL DEFAULT true,
    "enableEmailNotifs" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saas_payments_invoiceNumber_key" ON "saas_payments"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "saas_payments" ADD CONSTRAINT "saas_payments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "saas_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_ticket_responses" ADD CONSTRAINT "platform_ticket_responses_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "platform_support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
