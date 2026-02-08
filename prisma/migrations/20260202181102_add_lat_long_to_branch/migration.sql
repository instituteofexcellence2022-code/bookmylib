-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "payeeName" TEXT,
ADD COLUMN     "upiId" TEXT;

-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "durationUnit" TEXT,
ALTER COLUMN "value" DROP NOT NULL;
