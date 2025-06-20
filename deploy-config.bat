@echo off
setlocal EnableDelayedExpansion

echo.
echo 🎮 EFTO Game - Deployment Configuration Setup
echo ==============================================
echo.

REM Check if serverConfig.js already exists
if exist "config\serverConfig.js" (
    echo ⚠️  config\serverConfig.js already exists!
    set /p overwrite="Do you want to overwrite it? (y/N): "
    if /i not "!overwrite!"=="y" (
        echo Aborted. You can manually edit config\serverConfig.js
        pause
        exit /b 0
    )
)

REM Copy the example file
if not exist "config\serverConfig.example.js" (
    echo ❌ Error: config\serverConfig.example.js not found!
    echo Make sure you're running this script from the game root directory.
    pause
    exit /b 1
)

copy "config\serverConfig.example.js" "config\serverConfig.js" >nul
echo ✅ Created config\serverConfig.js from example

REM Interactive configuration
echo.
echo 📝 Let's configure your deployment settings:
echo.

REM Get base path
echo 1. What's your deployment path?
echo    Examples:
echo    - Root directory (https://yourdomain.com/): Just press Enter
echo    - Subdirectory (https://yourdomain.com/game/): Enter '/game'
echo    - Nested path (https://yourdomain.com/projects/efto/): Enter '/projects/efto'
echo    - GitHub Pages: Enter '/your-repository-name'
echo.
set /p base_path="Base path (or press Enter for root): "

REM Get server type
echo.
echo 2. What type of server are you using?
echo    1) PHP server (default)
echo    2) Python/Flask server  
echo    3) Custom endpoint
echo.
set /p server_type="Choose (1-3, default 1): "

REM Set endpoint based on server type
if "!server_type!"=="2" (
    set endpoint=api/highscores
) else if "!server_type!"=="3" (
    set /p endpoint="Enter your custom endpoint: "
) else (
    set endpoint=api/highscores.php
)

REM Development mode
echo.
set /p dev_mode="3. Enable development mode for extra logging? (y/N): "
if /i "!dev_mode!"=="y" (
    set is_dev=true
) else (
    set is_dev=false
)

REM Apply configuration
echo.
echo 🔧 Applying configuration...

REM Use PowerShell to replace values in the config file (more reliable than batch)
powershell -Command "(Get-Content 'config\serverConfig.js') -replace \"basePath: '',\", \"basePath: '!base_path!',\" | Set-Content 'config\serverConfig.js'"
powershell -Command "(Get-Content 'config\serverConfig.js') -replace \"highscores: 'api/highscores.php',\", \"highscores: '!endpoint!',\" | Set-Content 'config\serverConfig.js'"
powershell -Command "(Get-Content 'config\serverConfig.js') -replace \"isDevelopment: false,\", \"isDevelopment: !is_dev!,\" | Set-Content 'config\serverConfig.js'"

echo ✅ Configuration applied!
echo.
echo 📋 Summary:
echo   - Base Path: '!base_path!'
echo   - API Endpoint: !endpoint!
echo   - Development Mode: !is_dev!
echo.
echo 🚀 Your config\serverConfig.js is ready!
echo    Upload it to your server alongside the game files.
echo.
echo 📖 For more information, see README_API_CONFIG.md
echo.
pause 