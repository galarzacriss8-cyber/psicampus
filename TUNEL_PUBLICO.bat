@echo off
title Psicampus - tunel publico
cd /d "%~dp0"

if not exist "tools\cloudflared.exe" (
  echo Descargando Cloudflare Tunnel...
  if not exist tools mkdir tools
  powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'tools\cloudflared.exe' -UseBasicParsing"
)

echo.
echo Asegurate de que el servidor este corriendo (INICIAR.bat).
echo.
echo Creando enlace publico HTTPS...
echo Cuando aparezca la linea "https://....trycloudflare.com", ese es tu link.
echo No cierres esta ventana mientras quieras que el link funcione.
echo.

tools\cloudflared.exe tunnel --url http://localhost:4321 --no-autoupdate
pause
