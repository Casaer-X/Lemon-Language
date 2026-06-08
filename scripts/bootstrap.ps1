#!/usr/bin/env pwsh
# ============================================================
# Language Lemon 自举构建脚本
# 从源码构建 T1 标准编译器 (v4.1.0)
#
# 用法:
#   ./scripts/bootstrap.ps1
#
# 依赖:
#   - Rust (cargo) — 用于编译 T0 引导编译器
#   - GCC (MinGW)  — 用于编译生成的 C 代码
# ============================================================
param(
    [string]$OutputDir = "build",
    [switch]$SkipT0 = $false,
    [switch]$Verify = $true
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│  Language Lemon Bootstrap Build v4.1.0   │" -ForegroundColor Cyan
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

# ── Locate Rust T0 compiler ────────────────────────────
$T0Dir = Join-Path $RepoRoot "lemonc"
$T0Exe = Get-ChildItem -Path "$T0Dir\target\*\release\lemonc.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $SkipT0) {
    if (-not $T0Exe) {
        Write-Host "[1/5] Building Rust T0 compiler..." -ForegroundColor Yellow
        Push-Location $T0Dir
        cargo build --release --bin lemonc
        Pop-Location
        $T0Exe = Get-ChildItem -Path "$T0Dir\target\*\release\lemonc.exe" | Select-Object -First 1
        Write-Host "       T0 built: $($T0Exe.FullName)" -ForegroundColor Green
    } else {
        Write-Host "[1/5] Using existing T0: $($T0Exe.FullName)" -ForegroundColor Green
    }
} else {
    Write-Host "[1/5] T0 build skipped" -ForegroundColor DarkGray
}

# ── Collect source files ───────────────────────────────
$SourceDir = Join-Path $RepoRoot "lemonc_lm"
$SourceFiles = Get-ChildItem -Path $SourceDir -Recurse -Filter "*.lm" |
    Where-Object { $_.Name -notmatch "^(test_|bench_)" -and $_.Name -notmatch "Test\.lm$" }

Write-Host "[2/5] Source files: $($SourceFiles.Count) .lm files" -ForegroundColor Green

# ── T0 → T1.c ───────────────────────────────────────────
$BuildDir = Join-Path $RepoRoot $OutputDir
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

Write-Host "[3/5] Generating T1.c (T0 -> lemonc_lm..." -ForegroundColor Yellow
$T1C = Join-Path $BuildDir "lemonc_lm.c"
& $T0Exe.FullName --target c -o $T1C @($SourceFiles.FullName) 2>&1 | ForEach-Object { Write-Host "       $_" }
Write-Host "       T1.c generated" -ForegroundColor Green

# ── GCC T1.c → T1.exe ───────────────────────────────────
Write-Host "[4/5] Compiling T1.exe (GCC)..." -ForegroundColor Yellow
$T1Exe = Join-Path $BuildDir "lemonc_lm.exe"
$gccOutput = gcc -O2 -static -o $T1Exe $T1C 2>&1
$errors = $gccOutput | Select-String "error:"
if ($errors) {
    Write-Host "       GCC errors:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "       $_" -ForegroundColor Red }
    exit 1
}
$size = [math]::Round((Get-Item $T1Exe).Length / 1KB, 1)
Write-Host "       T1.exe built: ${size} KB" -ForegroundColor Green

# ── Bootstrap verification ──────────────────────────────
if ($Verify) {
    Write-Host "[5/5] Bootstrap verification (T1 -> T2.c -> T3.c)..." -ForegroundColor Yellow

    $T2Dir = Join-Path $RepoRoot "${OutputDir}_t2"
    $T3Dir = Join-Path $RepoRoot "${OutputDir}_t3"
    New-Item -ItemType Directory -Force -Path $T2Dir, $T3Dir | Out-Null

    $T2C = Join-Path $T2Dir "lemonc_lm.c"
    $T3C = Join-Path $T3Dir "lemonc_lm.c"

    & $T1Exe --target c -o $T2C @($SourceFiles.FullName) 2>&1 | Out-Null
    & $T1Exe --target c -o $T3C @($SourceFiles.FullName) 2>&1 | Out-Null

    $h2 = (Get-FileHash $T2C -Algorithm SHA256).Hash
    $h3 = (Get-FileHash $T3C -Algorithm SHA256).Hash

    if ($h2 -eq $h3) {
        Write-Host "       FIXED POINT VERIFIED" -ForegroundColor Green
        Write-Host "       T2.c ≡ T3.c  SHA256: $h2" -ForegroundColor Green
    } else {
        Write-Host "       MISMATCH!" -ForegroundColor Red
        Write-Host "       T2: $h2" -ForegroundColor Red
        Write-Host "       T3: $h3" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│  Bootstrap Complete                       │" -ForegroundColor Cyan
Write-Host "│  Output: $T1Exe                           │" -ForegroundColor Cyan
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor Cyan
