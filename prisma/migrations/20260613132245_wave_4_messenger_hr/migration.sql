-- CreateTable
CREATE TABLE "DeliveryJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "address" TEXT NOT NULL,
    "description" TEXT,
    "deliveryFeeCents" INTEGER NOT NULL DEFAULT 0,
    "feeChannel" TEXT NOT NULL DEFAULT 'CASH',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "deliveredAt" DATETIME,
    "deliveredById" TEXT,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryJob_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryJob_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "position" TEXT,
    "salaryCents" INTEGER NOT NULL DEFAULT 0,
    "hireDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Employee_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "paidAt" DATETIME,
    "paidById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayrollRun_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollRun_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "note" TEXT,
    CONSTRAINT "PayrollLine_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PayrollLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DeliveryJob_storeId_status_idx" ON "DeliveryJob"("storeId", "status");

-- CreateIndex
CREATE INDEX "DeliveryJob_createdAt_idx" ON "DeliveryJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryJob_storeId_jobNumber_key" ON "DeliveryJob"("storeId", "jobNumber");

-- CreateIndex
CREATE INDEX "Employee_storeId_isActive_idx" ON "Employee"("storeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_storeId_employeeCode_key" ON "Employee"("storeId", "employeeCode");

-- CreateIndex
CREATE INDEX "PayrollRun_storeId_status_idx" ON "PayrollRun"("storeId", "status");

-- CreateIndex
CREATE INDEX "PayrollRun_periodStart_periodEnd_idx" ON "PayrollRun"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "PayrollLine_payrollRunId_idx" ON "PayrollLine"("payrollRunId");

-- CreateIndex
CREATE INDEX "PayrollLine_employeeId_idx" ON "PayrollLine"("employeeId");
