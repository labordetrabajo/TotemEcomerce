@echo off
title Cerrar TOTEM E-COMMERCE

echo ==========================================
echo Cerrando servicios de TOTEM E-COMMERCE...
echo ==========================================

taskkill /FI "WINDOWTITLE eq Backend - TOTEM*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend - TOTEM*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Admin - TOTEM*" /T /F >nul 2>&1

echo.
echo Todos los servicios fueron cerrados.
echo ==========================================

timeout /t 2 /nobreak >nul
exit