@echo off
setlocal enabledelayedexpansion

REM EFTO Game - Build and Deploy Script (Windows)
REM This script builds the production version and optionally deploys it

echo 🚀 EFTO Game - Build and Deploy Script
echo ======================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing build dependencies...
    npm install
    if !errorlevel! equ 0 (
        echo ✅ Dependencies installed successfully
    ) else (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Build production version
echo 🏗️  Building production version...
npm run build

if %errorlevel% equ 0 (
    echo ✅ Build completed successfully!
    echo 📁 Production files are in the 'dist/' directory
) else (
    echo ❌ Build failed!
    pause
    exit /b 1
)

REM Ask user if they want to deploy
set /p "deploy_choice=🚀 Do you want to deploy to server? (y/N): "

if /i "%deploy_choice%"=="y" (
    echo 🌐 Starting deployment...
    
    REM Check if deploy script exists
    if exist "deploy-cache-bust.bat" (
        REM Copy dist files to project root for deployment
        echo 📋 Preparing files for deployment...
        xcopy "dist\*" "." /E /Y >nul
        
        REM Run the existing deploy script
        call deploy-cache-bust.bat
        
        echo ✅ Deployment completed!
    ) else (
        echo ❌ Deploy script not found. Please run deploy manually.
    )
) else (
    echo ℹ️  Skipping deployment. Production files are ready in 'dist/' directory.
)

echo.
echo 🎉 Process completed!
echo 💡 Tips:
echo    - Use 'npm run build' for production builds
echo    - Use 'npm run build:dev' for development builds
echo    - Use 'npm run clean' to clean the dist directory

pause 