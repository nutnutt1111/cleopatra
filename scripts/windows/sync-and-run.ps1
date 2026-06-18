# DonutiT (donutit-cleopatra) — sync latest + run on localhost:3005
# Usage (PowerShell):  .\scripts\windows\sync-and-run.ps1
# Default path: C:\Users\HP\Projects\cleopatra

param(
    [string]$ProjectPath = "C:\Users\HP\Projects\cleopatra",
    [string]$Branch = "cursor/unified-port-3005-e20d",
    [switch]$ResetDb
)

$ErrorActionPreference = "Stop"

Write-Host "=== DonutiT sync & run ===" -ForegroundColor Cyan
Write-Host "Project: $ProjectPath"
Write-Host "Branch:  $Branch"

if (-not (Test-Path $ProjectPath)) {
    Write-Host "Cloning repo..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path (Split-Path $ProjectPath) | Out-Null
    git clone https://github.com/nutnutt1111/cleopatra.git $ProjectPath
}

Set-Location $ProjectPath

Write-Host "Fetching latest..." -ForegroundColor Yellow
git fetch origin
git checkout $Branch
git pull origin $Branch

if (-not (Test-Path ".env")) {
    Write-Host "Creating .env from .env.example" -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

Write-Host "Installing dependencies..." -ForegroundColor Yellow
yarn install
yarn --cwd apps/donutit-react install

if ($ResetDb -or -not (Test-Path "prisma/dev.db")) {
    Write-Host "Database: migrate + seed (demo data)" -ForegroundColor Yellow
    yarn db:reset
} else {
    Write-Host "Database: migrate only" -ForegroundColor Yellow
    yarn db:migrate
}

$lsFile = "apps/donutit-react/public/data/local-storage/trade-in-drafts.json"
if (Test-Path $lsFile) {
    Write-Host "localStorage seed: $lsFile (loaded on first browser visit)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting donutit-cleopatra on http://localhost:3005" -ForegroundColor Green
Write-Host "Login: owner@donutit.local / donutit-dev"
Write-Host ""

yarn dev
