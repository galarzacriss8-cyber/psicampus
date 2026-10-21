@echo off
title Psicampus
cd /d "%~dp0"

set "NODE_BIN=C:\Users\galar\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"

if exist "%NODE_BIN%" (
  echo Iniciando Psicampus...
  start "Psicampus" "%NODE_BIN%" server\index.mjs
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo No se encontro Node.js.
    echo Instala Node 22 o superior desde https://nodejs.org y vuelve a ejecutar este archivo.
    pause
    exit /b 1
  )
  start "Psicampus" node server\index.mjs
)

timeout /t 3 >nul
start "" "http://localhost:4321"
echo.
echo Psicampus se abrio en http://localhost:4321
echo Si la ventana del servidor se cierra, la app dejara de responder.
timeout /t 5 >nul
