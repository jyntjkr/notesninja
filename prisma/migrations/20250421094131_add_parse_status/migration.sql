-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Upload" ADD COLUMN     "parseStatus" "ParseStatus" NOT NULL DEFAULT 'PENDING';
