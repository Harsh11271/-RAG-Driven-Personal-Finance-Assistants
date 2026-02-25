@echo off
echo.
echo ============================================================
echo   AI Finance Assistant - Starting...
echo ============================================================
echo.

docker-compose up --build -d

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start containers. Is Docker Desktop running?
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   All containers started successfully!
echo ============================================================
echo.
echo   Open the app in your browser:
echo.
echo     Frontend:    http://localhost:8080
echo     API Health:  http://localhost:3000/health
echo     RAG Health:  http://localhost:8081/health
echo.
echo ============================================================
echo.
pause
