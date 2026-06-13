-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "creditLimitCents" INTEGER NOT NULL DEFAULT 0,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PawnTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "itemDescription" TEXT NOT NULL,
    "principalCents" INTEGER NOT NULL,
    "interestRateBps" INTEGER NOT NULL DEFAULT 200,
    "interestPeriodDays" INTEGER NOT NULL DEFAULT 30,
    "nextInterestDueAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "transferDetail" TEXT,
    "createdById" TEXT NOT NULL,
    "redeemedAt" DATETIME,
    "redeemedById" TEXT,
    "voidedAt" DATETIME,
    "voidReason" TEXT,
    "voidedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PawnTicket_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PawnTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PawnTicket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PawnTicket_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PawnTicket_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PawnPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'CASH',
    "transferDetail" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PawnPayment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PawnTicket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PawnPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditSale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "paidCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreditSale_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CreditSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CreditSale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstallmentPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creditSaleId" TEXT NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "installmentAmountCents" INTEGER NOT NULL,
    "paidInstallments" INTEGER NOT NULL DEFAULT 0,
    "nextDueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstallmentPlan_creditSaleId_fkey" FOREIGN KEY ("creditSaleId") REFERENCES "CreditSale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "creditSaleId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'CASH',
    "transferDetail" TEXT,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomerPayment_creditSaleId_fkey" FOREIGN KEY ("creditSaleId") REFERENCES "CreditSale" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Customer_storeId_name_idx" ON "Customer"("storeId", "name");

-- CreateIndex
CREATE INDEX "Customer_storeId_phone_idx" ON "Customer"("storeId", "phone");

-- CreateIndex
CREATE INDEX "PawnTicket_storeId_status_idx" ON "PawnTicket"("storeId", "status");

-- CreateIndex
CREATE INDEX "PawnTicket_customerId_idx" ON "PawnTicket"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PawnTicket_storeId_ticketNumber_key" ON "PawnTicket"("storeId", "ticketNumber");

-- CreateIndex
CREATE INDEX "PawnPayment_ticketId_idx" ON "PawnPayment"("ticketId");

-- CreateIndex
CREATE INDEX "CreditSale_storeId_status_idx" ON "CreditSale"("storeId", "status");

-- CreateIndex
CREATE INDEX "CreditSale_customerId_idx" ON "CreditSale"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditSale_storeId_saleNumber_key" ON "CreditSale"("storeId", "saleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentPlan_creditSaleId_key" ON "InstallmentPlan"("creditSaleId");

-- CreateIndex
CREATE INDEX "InstallmentPlan_status_nextDueDate_idx" ON "InstallmentPlan"("status", "nextDueDate");

-- CreateIndex
CREATE INDEX "CustomerPayment_customerId_createdAt_idx" ON "CustomerPayment"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerPayment_creditSaleId_idx" ON "CustomerPayment"("creditSaleId");
