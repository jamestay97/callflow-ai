@echo off
title Kids YouTube Studio - Test Launch
cd /d "%~dp0"
echo.
echo  ========================================
echo   Kids YouTube Studio - TEST LAUNCH
echo  ========================================
echo.
echo  1. Generates a sample video (if needed)
echo  2. Opens the app in your browser
echo.
call npm run test:launch
pause
