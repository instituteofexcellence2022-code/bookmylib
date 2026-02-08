/*
  Warnings:

  - You are about to drop the column `rewardAmount` on the `referrals` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "libraries" ADD COLUMN     "referralSettings" JSONB;

-- AlterTable
ALTER TABLE "referrals" DROP COLUMN "rewardAmount",
ADD COLUMN     "refereeDiscount" DOUBLE PRECISION,
ADD COLUMN     "referrerCouponCode" TEXT;
