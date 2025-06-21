@echo off
setlocal enabledelayedexpansion

echo 🚀 EFTO Game - Cache Busting Deployment
echo ========================================

REM Get current version from config
for /f "tokens=3 delims=^"" %%a in ('findstr "GAME_VERSION" config\gameConfig.js') do set CURRENT_VERSION=%%a
echo Current version: %CURRENT_VERSION%

REM Prompt for new version
set /p NEW_VERSION="Enter new version (or press Enter to auto-increment): "

REM Auto-increment if no version provided
if "%NEW_VERSION%"=="" (
    for /f "tokens=1,2,3 delims=." %%a in ("%CURRENT_VERSION%") do (
        set MAJOR=%%a
        set MINOR=%%b
        set /a PATCH=%%c+1
    )
    set NEW_VERSION=!MAJOR!.!MINOR!.!PATCH!
)

echo New version: %NEW_VERSION%

REM Update version in gameConfig.js
powershell -Command "(Get-Content config\gameConfig.js) -replace 'GAME_VERSION = \^".*\^"', 'GAME_VERSION = \^"%NEW_VERSION%\^"' | Set-Content config\gameConfig.js"
echo ✅ Updated version in gameConfig.js

REM Update build timestamp
for /f %%i in ('powershell -Command "[math]::Floor((Get-Date -UFormat %%s)) * 1000"') do set TIMESTAMP=%%i
powershell -Command "(Get-Content config\gameConfig.js) -replace 'BUILD_TIMESTAMP = [0-9]+', 'BUILD_TIMESTAMP = %TIMESTAMP%' | Set-Content config\gameConfig.js"
echo ✅ Updated build timestamp

REM Generate cache-busting manifest
echo 📋 Generating cache manifest...
(
echo {
echo     "version": "%NEW_VERSION%",
echo     "timestamp": %TIMESTAMP%,
echo     "files": {
echo         "game-modular.js": "v=%NEW_VERSION%",
echo         "config/gameConfig.js": "v=%NEW_VERSION%",
echo         "data/gameItems.js": "v=%NEW_VERSION%",
echo         "data/playerSpells.js": "v=%NEW_VERSION%",
echo         "systems/spellSystem.js": "v=%NEW_VERSION%",
echo         "utils/gameUtils.js": "v=%NEW_VERSION%",
echo         "index.html": "v=%NEW_VERSION%"
echo     },
echo     "updated": "%date:~6,4%-%date:~3,2%-%date:~0,2%T%time:~0,8%Z"
echo }
) > cache-manifest.json
echo ✅ Generated cache manifest

REM Create .htaccess if it doesn't exist
if not exist .htaccess (
    echo 🔧 Creating .htaccess for cache control...
    (
    echo # EFTO Game - Cache Control for Mobile Browsers
    echo ^<IfModule mod_headers.c^>
    echo     # Force no-cache for HTML files
    echo     ^<FilesMatch "\.(html^|htm^)$"^>
    echo         Header set Cache-Control "no-cache, no-store, must-revalidate"
    echo         Header set Pragma "no-cache"
    echo         Header set Expires 0
    echo     ^</FilesMatch^>
    echo.    
    echo     # Short cache for JS/CSS with version parameters
    echo     ^<FilesMatch "\.(js^|css^)$"^>
    echo         Header set Cache-Control "public, max-age=300, must-revalidate"
    echo     ^</FilesMatch^>
    echo.    
    echo     # Longer cache for images
    echo     ^<FilesMatch "\.(png^|jpg^|jpeg^|gif^|webp^)$"^>
    echo         Header set Cache-Control "public, max-age=3600"
    echo     ^</FilesMatch^>
    echo.    
    echo     # Force revalidation for JSON files
    echo     ^<FilesMatch "\.json$"^>
    echo         Header set Cache-Control "no-cache, must-revalidate"
    echo     ^</FilesMatch^>
    echo ^</IfModule^>
    echo.
    echo # Enable compression
    echo ^<IfModule mod_deflate.c^>
    echo     AddOutputFilterByType DEFLATE text/plain
    echo     AddOutputFilterByType DEFLATE text/html
    echo     AddOutputFilterByType DEFLATE text/xml
    echo     AddOutputFilterByType DEFLATE text/css
    echo     AddOutputFilterByType DEFLATE application/xml
    echo     AddOutputFilterByType DEFLATE application/xhtml+xml
    echo     AddOutputFilterByType DEFLATE application/rss+xml
    echo     AddOutputFilterByType DEFLATE application/javascript
    echo     AddOutputFilterByType DEFLATE application/x-javascript
    echo ^</IfModule^>
    ) > .htaccess
    echo ✅ Created .htaccess
)

REM Create deployment checklist
echo 📝 Creating deployment checklist...
(
echo # EFTO Game Deployment Checklist - v%NEW_VERSION%
echo.
echo ## Pre-Deployment
echo - [ ] All changes tested locally
echo - [ ] Version updated to %NEW_VERSION%
echo - [ ] Build timestamp updated to %TIMESTAMP%
echo - [ ] Mobile browser testing completed
echo.
echo ## Cache Busting
echo - [ ] Version number incremented in gameConfig.js
echo - [ ] Cache manifest generated
echo - [ ] .htaccess file configured for cache control
echo.
echo ## Mobile Browser Testing
echo Test the following after deployment:
echo - [ ] iPhone Safari (force refresh^)
echo - [ ] Chrome Mobile (force refresh^)
echo - [ ] Samsung Internet
echo - [ ] Firefox Mobile
echo.
echo ## Post-Deployment
echo - [ ] Clear CDN cache (if using^)
echo - [ ] Test on mobile devices
echo - [ ] Verify cache-busting is working
echo - [ ] Monitor for any loading issues
echo.
echo ## Force Refresh Instructions for Users
echo If users report old version:
echo 1. Mobile Safari: Settings ^> Safari ^> Clear History and Website Data
echo 2. Chrome Mobile: Settings ^> Privacy ^> Clear browsing data
echo 3. Manual: Add ?v=%NEW_VERSION% to URL
) > deployment-checklist.md

echo ✅ Deployment checklist created

REM Display summary
echo.
echo 🎉 DEPLOYMENT READY!
echo ===================
echo Version: %CURRENT_VERSION% → %NEW_VERSION%
echo Timestamp: %TIMESTAMP%
echo.
echo 📱 Mobile Cache Busting Features:
echo   ✅ Version-based URL parameters
echo   ✅ Cache control headers
echo   ✅ Automatic update detection
echo   ✅ Mobile refresh prompts
echo.
echo 📋 Next Steps:
echo   1. Review deployment-checklist.md
echo   2. Upload files to server
echo   3. Test on mobile devices
echo   4. Clear CDN cache if applicable
echo.

echo 🚀 Ready for deployment!
pause 