@echo off
REM INICIAR.cmd - Doble clic aqui para el arranque guiado (no necesitas saber PowerShell).
REM Abre una consola y corre onboarding.ps1 (instala/verifica, crea .env, corre el doctor). Gasta $0.
cd /d "%~dp0"
echo.
echo   AUTGG-FLOW - Arranque guiado
echo   (se abrira el asistente; sigue las preguntas en pantalla)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0onboarding.ps1"
echo.
echo   Termino. Puedes cerrar esta ventana.
pause
