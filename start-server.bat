@echo off
title 𝑷𝑨𝑹𝑴𝑨𝑹'𝑺 𝑮𝑲 𝟓.𝟎 𝑻𝑶𝑷𝑷𝑬𝑹𝑺 𝑩𝑨𝑻𝑪𝑯 - Web Server
echo ========================================================
echo   𝑷𝑨𝑹𝑴𝑨𝑹'𝑺 𝑮𝑲 𝟓.𝟎 𝑻𝑶𝑷𝑷𝑬𝑹𝑺 𝑩𝑨𝑻𝑪𝑯
echo   Course Portal provided by Study Mafia
echo ========================================================
echo.
echo Starting local web server on http://localhost:8080 ...
echo Press Ctrl+C in this window to stop the server.
echo.
start http://localhost:8080
python -m http.server 8080 -d public
pause
