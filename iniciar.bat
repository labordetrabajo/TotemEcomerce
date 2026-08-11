@echo off
title TOTEM E-COMMERCE

echo ==========================================
echo Iniciando TOTEM E-COMMERCE
echo ==========================================

echo.
echo Iniciando Backend...
start "Backend - TOTEM" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 2 /nobreak >nul

echo Iniciando Frontend...
start "Frontend - TOTEM" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 2 /nobreak >nul

echo Iniciando Admin...
start "Admin - TOTEM" cmd /k "cd /d "%~dp0admin" && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo Abriendo el frontend...
start "" "http://localhost:5173"

echo.
echo ==========================================
echo Los tres servicios fueron iniciados.
echo ==========================================

exit