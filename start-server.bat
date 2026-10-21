@echo off
title 𝑷𝑨𝑹𝑴𝑨𝑹'𝑺 𝑮𝑲 𝟓.𝟎 𝑻𝑶𝑷𝑷𝑬𝑹𝑺 𝑩𝑨𝑻𝑪𝑯 - Web Server
echo ========================================================
echo   𝑷𝑨𝑹𝑴𝑨𝑹'𝑺 𝑮𝑲 𝟓.𝟎 𝑻𝑶𝑷𝑷𝑬𝑹𝑺 𝑩𝑨𝑻𝑪𝑯
echo   Course Portal provided by Study Mafia
echo ========================================================
echo.
echo Starting local web server with dedicated video player...
echo   http://localhost:8080
echo Press Ctrl+C in this window to stop the server.
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  node server.js
  goto :end
)

echo Node.js was not found on this PC.
echo Falling back to a basic static server (video resolver API disabled,
echo the player will use the backup embedded player).
echo.
python -m http.server 8080 -d public

:end
pause
