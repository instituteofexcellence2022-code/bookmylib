/*
  Warnings:

  - The `wifiDetails` column on the `branches` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `operatingHours` column on the `branches` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[phone]` on the table `students` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "libraryRules" JSONB,
DROP COLUMN "wifiDetails",
ADD COLUMN     "wifiDetails" JSONB,
DROP COLUMN "operatingHours",
ADD COLUMN     "operatingHours" JSONB;

-- AlterTable
ALTER TABLE "students" ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "students_phone_key" ON "students"("phone");
