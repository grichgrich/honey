@echo off
echo Stopping any existing servers...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul

echo Installing dependencies...
call npm install

echo Starting Python server...
start "Python Leverage Service" cmd /k "python python/leverage_service.py"

echo Waiting for Python server to start...
timeout /t 2 /nobreak >nul

echo Starting Vite server...
start "Vite Dev Server" cmd /k "npm run dev"

echo Servers started! Press Ctrl+C in the respective windows to stop them.
echo Python server: http://localhost:8000/health
echo Vite server:  http://localhost:5001