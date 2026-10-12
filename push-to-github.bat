@echo off
title Push to GitHub - shikshiten/parmar-gk-5.0
echo ==========================================================
echo   Pushing Parmar GK 5.0 to GitHub Repository
echo   Repo: https://github.com/shikshiten/parmar-gk-5.0
echo ==========================================================
echo.
set "PATH=%USERPROFILE%\AppData\Local\Programs\MinGit\cmd;%PATH%"
git push -u origin main
echo.
echo ==========================================================
if %errorlevel% equ 0 (
    echo Successfully pushed to GitHub!
) else (
    echo Push failed or was cancelled.
)
echo ==========================================================
pause
