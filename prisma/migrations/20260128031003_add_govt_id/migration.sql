/*
  Warnings:

  - You are about to drop the column `publishAt` on the `announcements` table. All the data in the column will be lost.
  - You are about to drop the column `targetAudience` on the `announcements` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceNumber` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `minOrder` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `usedCount` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `validFrom` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `validTo` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `features` on the `seats` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `seats` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `staff_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `staff_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `staff_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `completedHours` on the `student_goals` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `student_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `assignedTo` on the `support_tickets` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `support_tickets` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `ticket_comments` table. All the data in the column will be lost.
  - You are about to drop the column `isInternal` on the `ticket_comments` table. All the data in the column will be lost.
  - You are about to drop the column `purpose` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `wallet_transactions` table. All the data in the column will be lost.
  - Added the required column `target` to the `announcements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountType` to the `promotions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountValue` to the `promotions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDate` to the `promotions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `promotions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `promotions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `seats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `staff_attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dayOfWeek` to the `staff_shifts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountPaid` to the `student_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentStatus` to the `student_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `support_tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ticket_comments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userType` to the `ticket_comments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reason` to the `wallet_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "liked_quotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "liked_quotes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "additional_fees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "additional_fees_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "additional_fees_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_announcements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "announcements_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_announcements" ("content", "createdAt", "expiresAt", "id", "isActive", "libraryId", "title", "type") SELECT "content", "createdAt", "expiresAt", "id", "isActive", "libraryId", "title", "type" FROM "announcements";
DROP TABLE "announcements";
ALTER TABLE "new_announcements" RENAME TO "announcements";
CREATE TABLE "new_attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "checkIn" DATETIME NOT NULL,
    "checkOut" DATETIME,
    "duration" INTEGER,
    "status" TEXT NOT NULL,
    "method" TEXT,
    "verifiedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "attendance_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_attendance" ("branchId", "checkIn", "checkOut", "createdAt", "date", "duration", "id", "libraryId", "status", "studentId") SELECT "branchId", "checkIn", "checkOut", "createdAt", "date", "duration", "id", "libraryId", "status", "studentId" FROM "attendance";
DROP TABLE "attendance";
ALTER TABLE "new_attendance" RENAME TO "attendance";
CREATE INDEX "attendance_studentId_date_idx" ON "attendance"("studentId", "date");
CREATE INDEX "attendance_branchId_date_idx" ON "attendance"("branchId", "date");
CREATE TABLE "new_branches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "managerName" TEXT,
    "seatCount" INTEGER NOT NULL DEFAULT 0,
    "area" TEXT,
    "description" TEXT,
    "mapsLink" TEXT,
    "images" TEXT,
    "wifiDetails" TEXT,
    "operatingHours" TEXT,
    "amenities" TEXT,
    "qrCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "branches_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "branches_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_branches" ("address", "amenities", "city", "contactPhone", "createdAt", "id", "isActive", "libraryId", "name", "operatingHours", "ownerId", "pincode", "state", "updatedAt") SELECT "address", "amenities", "city", "contactPhone", "createdAt", "id", "isActive", "libraryId", "name", "operatingHours", "ownerId", "pincode", "state", "updatedAt" FROM "branches";
DROP TABLE "branches";
ALTER TABLE "new_branches" RENAME TO "branches";
CREATE UNIQUE INDEX "branches_qrCode_key" ON "branches"("qrCode");
CREATE TABLE "new_focus_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "duration" INTEGER,
    "label" TEXT,
    "rating" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "focus_sessions_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "focus_sessions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_focus_sessions" ("createdAt", "duration", "endTime", "id", "libraryId", "startTime", "studentId") SELECT "createdAt", "duration", "endTime", "id", "libraryId", "startTime", "studentId" FROM "focus_sessions";
DROP TABLE "focus_sessions";
ALTER TABLE "new_focus_sessions" RENAME TO "focus_sessions";
CREATE TABLE "new_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "feeId" TEXT,
    "type" TEXT NOT NULL,
    "relatedId" TEXT,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "gatewayProvider" TEXT,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "gatewaySignature" TEXT,
    "proofUrl" TEXT,
    "promotionId" TEXT,
    "discountAmount" REAL,
    "transactionId" TEXT,
    "invoiceNo" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "student_subscriptions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "additional_fees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amount", "createdAt", "description", "id", "libraryId", "method", "status", "studentId", "transactionId") SELECT "amount", "createdAt", "description", "id", "libraryId", "method", "status", "studentId", "transactionId" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE UNIQUE INDEX "payments_invoiceNo_key" ON "payments"("invoiceNo");
CREATE TABLE "new_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "duration" INTEGER NOT NULL,
    "durationUnit" TEXT NOT NULL DEFAULT 'months',
    "category" TEXT NOT NULL DEFAULT 'fixed',
    "billingCycle" TEXT NOT NULL DEFAULT 'per_month',
    "hoursPerDay" REAL,
    "shiftStart" TEXT,
    "shiftEnd" TEXT,
    "type" TEXT,
    "features" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "plans_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "plans_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_plans" ("createdAt", "description", "duration", "id", "isActive", "libraryId", "name", "price", "type", "updatedAt") SELECT "createdAt", "description", "duration", "id", "isActive", "libraryId", "name", "price", "type", "updatedAt" FROM "plans";
DROP TABLE "plans";
ALTER TABLE "new_plans" RENAME TO "plans";
CREATE TABLE "new_promotions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT,
    "planId" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" REAL NOT NULL,
    "minOrderValue" REAL,
    "maxDiscount" REAL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER,
    "perUserLimit" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "promotions_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "promotions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "promotions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_promotions" ("code", "createdAt", "id", "isActive", "libraryId", "maxDiscount", "usageLimit") SELECT "code", "createdAt", "id", "isActive", "libraryId", "maxDiscount", "usageLimit" FROM "promotions";
DROP TABLE "promotions";
ALTER TABLE "new_promotions" RENAME TO "promotions";
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");
CREATE TABLE "new_seats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "section" TEXT,
    "row" TEXT,
    "column" TEXT,
    "status" TEXT NOT NULL,
    "type" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "seats_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seats_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_seats" ("branchId", "createdAt", "id", "libraryId", "number", "section", "updatedAt") SELECT "branchId", "createdAt", "id", "libraryId", "number", "section", "updatedAt" FROM "seats";
DROP TABLE "seats";
ALTER TABLE "new_seats" RENAME TO "seats";
CREATE UNIQUE INDEX "seats_branchId_number_key" ON "seats"("branchId", "number");
CREATE TABLE "new_staff_attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "checkIn" DATETIME NOT NULL,
    "checkOut" DATETIME,
    "duration" INTEGER,
    "status" TEXT NOT NULL,
    "method" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "staff_attendance_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "staff_attendance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "staff_attendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_staff_attendance" ("branchId", "checkIn", "checkOut", "createdAt", "date", "duration", "id", "libraryId", "staffId", "status") SELECT "branchId", "checkIn", "checkOut", "createdAt", "date", "duration", "id", "libraryId", "staffId", "status" FROM "staff_attendance";
DROP TABLE "staff_attendance";
ALTER TABLE "new_staff_attendance" RENAME TO "staff_attendance";
CREATE INDEX "staff_attendance_staffId_date_idx" ON "staff_attendance"("staffId", "date");
CREATE TABLE "new_staff_shifts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "staff_shifts_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "staff_shifts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "staff_shifts_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_staff_shifts" ("branchId", "endTime", "id", "libraryId", "staffId", "startTime") SELECT "branchId", "endTime", "id", "libraryId", "staffId", "startTime" FROM "staff_shifts";
DROP TABLE "staff_shifts";
ALTER TABLE "new_staff_shifts" RENAME TO "staff_shifts";
CREATE TABLE "new_student_goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetHours" INTEGER NOT NULL,
    "deadline" DATETIME,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "student_goals_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "student_goals_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_student_goals" ("createdAt", "id", "libraryId", "status", "studentId", "targetHours", "title", "updatedAt") SELECT "createdAt", "id", "libraryId", "status", "studentId", "targetHours", "title", "updatedAt" FROM "student_goals";
DROP TABLE "student_goals";
ALTER TABLE "new_student_goals" RENAME TO "student_goals";
CREATE TABLE "new_student_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "amountPaid" REAL NOT NULL,
    "discount" REAL,
    "finalAmount" REAL,
    "paymentStatus" TEXT NOT NULL,
    "seatId" TEXT,
    "shiftId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "student_subscriptions_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "student_subscriptions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "student_subscriptions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "student_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "student_subscriptions_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "seats" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_student_subscriptions" ("branchId", "createdAt", "endDate", "id", "libraryId", "planId", "startDate", "status", "studentId", "updatedAt") SELECT "branchId", "createdAt", "endDate", "id", "libraryId", "planId", "startDate", "status", "studentId", "updatedAt" FROM "student_subscriptions";
DROP TABLE "student_subscriptions";
ALTER TABLE "new_student_subscriptions" RENAME TO "student_subscriptions";
CREATE TABLE "new_student_wallets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'active',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "student_wallets_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "student_wallets_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_student_wallets" ("balance", "currency", "id", "libraryId", "studentId", "updatedAt") SELECT "balance", "currency", "id", "libraryId", "studentId", "updatedAt" FROM "student_wallets";
DROP TABLE "student_wallets";
ALTER TABLE "new_student_wallets" RENAME TO "student_wallets";
CREATE UNIQUE INDEX "student_wallets_libraryId_studentId_key" ON "student_wallets"("libraryId", "studentId");
CREATE TABLE "new_students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT,
    "image" TEXT,
    "dob" DATETIME,
    "gender" TEXT,
    "address" TEXT,
    "area" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "govtIdUrl" TEXT,
    "govtIdStatus" TEXT NOT NULL DEFAULT 'none',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_students" ("createdAt", "email", "id", "name", "phone", "updatedAt") SELECT "createdAt", "email", "id", "name", "phone", "updatedAt" FROM "students";
DROP TABLE "students";
ALTER TABLE "new_students" RENAME TO "students";
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");
CREATE TABLE "new_support_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "studentId" TEXT,
    "staffId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "support_tickets_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "support_tickets_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "support_tickets_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_support_tickets" ("category", "createdAt", "description", "id", "libraryId", "priority", "staffId", "status", "studentId", "updatedAt") SELECT "category", "createdAt", "description", "id", "libraryId", "priority", "staffId", "status", "studentId", "updatedAt" FROM "support_tickets";
DROP TABLE "support_tickets";
ALTER TABLE "new_support_tickets" RENAME TO "support_tickets";
CREATE TABLE "new_ticket_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "libraryId" TEXT NOT NULL,
    CONSTRAINT "ticket_comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ticket_comments_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ticket_comments" ("content", "createdAt", "id", "libraryId", "ticketId") SELECT "content", "createdAt", "id", "libraryId", "ticketId" FROM "ticket_comments";
DROP TABLE "ticket_comments";
ALTER TABLE "new_ticket_comments" RENAME TO "ticket_comments";
CREATE TABLE "new_wallet_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libraryId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_transactions_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "student_wallets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_wallet_transactions" ("amount", "createdAt", "id", "libraryId", "type", "walletId") SELECT "amount", "createdAt", "id", "libraryId", "type", "walletId" FROM "wallet_transactions";
DROP TABLE "wallet_transactions";
ALTER TABLE "new_wallet_transactions" RENAME TO "wallet_transactions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "liked_quotes_studentId_quoteId_key" ON "liked_quotes"("studentId", "quoteId");
