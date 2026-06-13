-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InstallmentPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creditSaleId" TEXT NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "installmentAmountCents" INTEGER NOT NULL,
    "installmentPeriodDays" INTEGER NOT NULL DEFAULT 30,
    "paidInstallments" INTEGER NOT NULL DEFAULT 0,
    "nextDueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstallmentPlan_creditSaleId_fkey" FOREIGN KEY ("creditSaleId") REFERENCES "CreditSale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_InstallmentPlan" ("createdAt", "creditSaleId", "id", "installmentAmountCents", "installmentCount", "nextDueDate", "paidInstallments", "status", "updatedAt") SELECT "createdAt", "creditSaleId", "id", "installmentAmountCents", "installmentCount", "nextDueDate", "paidInstallments", "status", "updatedAt" FROM "InstallmentPlan";
DROP TABLE "InstallmentPlan";
ALTER TABLE "new_InstallmentPlan" RENAME TO "InstallmentPlan";
CREATE UNIQUE INDEX "InstallmentPlan_creditSaleId_key" ON "InstallmentPlan"("creditSaleId");
CREATE INDEX "InstallmentPlan_status_nextDueDate_idx" ON "InstallmentPlan"("status", "nextDueDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
