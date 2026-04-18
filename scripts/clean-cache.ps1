# Senti News — Safe disk cache cleanup script.
#
# What it removes (none of these affect your code or data):
#   1. frontend/.next        — Next.js build cache (recreated on `npm run dev`)
#   2. frontend/node_modules/.cache — bundler tool caches
#   3. backend __pycache__   — Python bytecode (recreated automatically)
#   4. global npm cache      — npm internal cache (recreated on `npm install`)
#   5. global pip cache      — pip wheel cache (recreated on `pip install`)
#
# What it does NOT touch:
#   • Your source code
#   • node_modules (deps you need)
#   • backend/.env or frontend/.env.local
#   • .git history
#   • PostgreSQL data
#
# Usage:
#   PowerShell> .\scripts\clean-cache.ps1
#
# Safe to run any time. If Next.js dev server is running, it will be
# stopped first to release file locks on .next/.

$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path $PSScriptRoot -Parent

function Get-FreeGB { [Math]::Round((Get-PSDrive C).Free / 1GB, 2) }
function Get-DirSizeMB($p) {
    if (-not (Test-Path $p)) { return 0 }
    $s = (Get-ChildItem $p -Recurse -Force | Measure-Object -Property Length -Sum).Sum
    [math]::Round($s / 1MB, 1)
}

$before = Get-FreeGB
Write-Host "===  Senti News cache cleanup  ===" -ForegroundColor Cyan
Write-Host "Project root: $root"
Write-Host "Free space BEFORE: $before GB" -ForegroundColor Yellow
Write-Host ""

# 1. Stop Next.js dev so it releases file handles on .next
$conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
foreach ($c in $conns) {
    try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
}
if ($conns) { Start-Sleep -Milliseconds 800 }

# 2. frontend/.next
$nextPath = Join-Path $root "frontend\.next"
if (Test-Path $nextPath) {
    $sz = Get-DirSizeMB $nextPath
    Remove-Item $nextPath -Recurse -Force
    Write-Host ("[OK] Removed frontend/.next ({0} MB)" -f $sz) -ForegroundColor Green
}

# 3. frontend/node_modules/.cache
$nmCache = Join-Path $root "frontend\node_modules\.cache"
if (Test-Path $nmCache) {
    $sz = Get-DirSizeMB $nmCache
    Remove-Item $nmCache -Recurse -Force
    Write-Host ("[OK] Removed frontend/node_modules/.cache ({0} MB)" -f $sz) -ForegroundColor Green
}

# 4. backend __pycache__ (explicit Filter — safe pattern, not $_ inside Where-Object)
$backendPath = Join-Path $root "backend"
$pycache = Get-ChildItem $backendPath -Recurse -Directory -Force -Filter "__pycache__" -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty FullName
foreach ($p in $pycache) {
    Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue
}
if ($pycache.Count -gt 0) {
    Write-Host ("[OK] Removed {0} __pycache__ folders" -f $pycache.Count) -ForegroundColor Green
}

# 5. Global npm cache (only if npm is installed)
try {
    npm cache clean --force *> $null
    Write-Host "[OK] Cleaned global npm cache" -ForegroundColor Green
} catch {
    Write-Host "[skip] npm not found" -ForegroundColor DarkGray
}

# 6. Global pip cache
try {
    pip cache purge *> $null
    Write-Host "[OK] Cleaned global pip cache" -ForegroundColor Green
} catch {
    Write-Host "[skip] pip not found" -ForegroundColor DarkGray
}

$after = Get-FreeGB
$freed = [Math]::Round($after - $before, 2)
Write-Host ""
Write-Host "Free space AFTER:  $after GB" -ForegroundColor Yellow
Write-Host ("==  Freed: {0} GB  ==" -f $freed) -ForegroundColor Cyan
Write-Host ""
Write-Host "All caches will be regenerated automatically on next 'npm run dev' / 'npm install' / 'pip install'." -ForegroundColor DarkGray
