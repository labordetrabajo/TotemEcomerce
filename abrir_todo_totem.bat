@echo off
title Abrir todas las paginas - TOTEM E-COMMERCE

echo ==========================================
echo Abriendo paginas de TOTEM E-COMMERCE...
echo ==========================================

REM Frontend del totem
start "" "http://localhost:5173"

timeout /t 1 /nobreak >nul

REM Panel administrativo
start "" "http://localhost:5174"

timeout /t 1 /nobreak >nul

REM Endpoints utiles del backend
start "" "http://localhost:3000/products"

timeout /t 1 /nobreak >nul

start "" "http://localhost:3000/categories"

timeout /t 1 /nobreak >nul

start "" "http://localhost:3000/orders"

exit
