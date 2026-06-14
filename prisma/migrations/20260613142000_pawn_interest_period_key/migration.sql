-- AlterTable
ALTER TABLE "PawnPayment" ADD COLUMN "periodKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PawnPayment_periodKey_key" ON "PawnPayment"("periodKey");
