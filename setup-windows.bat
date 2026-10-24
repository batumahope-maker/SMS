@echo off
title ESSJT School System - Setup
color 0A
echo.
echo  =============================================
echo    ESSJT School Management System - Setup
echo  =============================================
echo.

:: Verify we are in the right place
if not exist "package.json" (
    echo  ERROR: Cannot find package.json
    echo  Make sure you run this from inside the essjt folder.
    echo  Right-click the essjt folder, open Terminal, then run: setup-windows.bat
    pause & exit /b 1
)

echo  [1/4] Installing packages (may take 2-5 minutes)...
call npm install
if %errorlevel% neq 0 (
    echo  ERROR: npm install failed. Check your internet connection.
    pause & exit /b 1
)
echo  Packages installed OK
echo.

echo  [2/4] Creating database...
:push_retry
call npx prisma db push
if %errorlevel% neq 0 (
    echo.
    echo  Database setup failed. This is usually a temporary network issue.
    echo  Press any key to retry, or close this window to cancel.
    pause >nul
    goto push_retry
)
echo  Database created OK
echo.

echo  [3/4] Loading demo data...
call npx prisma db seed
if %errorlevel% neq 0 (
    echo  WARNING: Demo data failed to load. You can run it again later with:
    echo  npx prisma db seed
) else (
    echo  Demo data loaded OK
)
echo.

echo  [4/4] Starting the app...
echo.
echo  =============================================
echo   App is starting at: http://localhost:3000
echo.
echo   LOGIN DETAILS:
echo   Admin:   username=admin     password=admin123
echo   Teacher: username=teacher1  password=teacher123
echo   Student: username=stu0001   password=student123
echo   Parent:  username=parent1   password=parent123
echo.
echo   Press Ctrl+C to stop the server
echo  =============================================
echo.
call npm run dev
