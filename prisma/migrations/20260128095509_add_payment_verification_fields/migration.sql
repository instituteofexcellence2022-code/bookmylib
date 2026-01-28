-- AlterTable
ALTER TABLE "payments" ADD COLUMN "verifiedAt" DATETIME;
ALTER TABLE "payments" ADD COLUMN "verifiedBy" TEXT;
ALTER TABLE "payments" ADD COLUMN "verifierRole" TEXT;

-- CreateTable
CREATE TABLE "student_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "student_notes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "student_notes_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "libraryId" TEXT,
    "branchId" TEXT,
    "govtIdUrl" TEXT,
    "govtIdStatus" TEXT NOT NULL DEFAULT 'none',
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "students_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "students_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_students" ("address", "area", "city", "createdAt", "dob", "email", "gender", "govtIdStatus", "govtIdUrl", "guardianName", "guardianPhone", "id", "image", "name", "password", "phone", "pincode", "state", "updatedAt") SELECT "address", "area", "city", "createdAt", "dob", "email", "gender", "govtIdStatus", "govtIdUrl", "guardianName", "guardianPhone", "id", "image", "name", "password", "phone", "pincode", "state", "updatedAt" FROM "students";
DROP TABLE "students";
ALTER TABLE "new_students" RENAME TO "students";
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
