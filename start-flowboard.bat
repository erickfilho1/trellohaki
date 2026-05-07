@echo off
cd /d C:\Users\Admin\Desktop\flowboard
start "" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
start http://localhost:3000
