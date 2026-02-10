/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `staff` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "additional_fees" ADD COLUMN     "billType" TEXT NOT NULL DEFAULT 'ONE_TIME';

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "hasLockers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLockerSeparate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalLockers" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "allowSeatReservation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "includesLocker" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "includesSeat" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "billingCycle" SET DEFAULT 'one_time';

-- AlterTable
ALTER TABLE "student_subscriptions" ADD COLUMN     "hasLocker" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockerId" TEXT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "lockers" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "section" TEXT,
    "type" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lockers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lockers_branchId_idx" ON "lockers"("branchId");

-- CreateIndex
CREATE INDEX "lockers_libraryId_idx" ON "lockers"("libraryId");

-- CreateIndex
CREATE UNIQUE INDEX "lockers_branchId_number_key" ON "lockers"("branchId", "number");

-- CreateIndex
CREATE INDEX "email_verifications_email_idx" ON "email_verifications"("email");

-- CreateIndex
CREATE INDEX "attendance_branchId_date_idx" ON "attendance"("branchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "staff_phone_key" ON "staff"("phone");

-- CreateIndex
CREATE INDEX "staff_attendance_branchId_date_idx" ON "staff_attendance"("branchId", "date");

-- CreateIndex
CREATE INDEX "students_libraryId_idx" ON "students"("libraryId");

-- CreateIndex
CREATE INDEX "students_branchId_idx" ON "students"("branchId");

-- AddForeignKey
ALTER TABLE "student_subscriptions" ADD CONSTRAINT "student_subscriptions_lockerId_fkey" FOREIGN KEY ("lockerId") REFERENCES "lockers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lockers" ADD CONSTRAINT "lockers_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lockers" ADD CONSTRAINT "lockers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
