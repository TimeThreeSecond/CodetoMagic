@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1"
if errorlevel 1 (
  echo Unable to start Code to Magic. Please check the message above.
  pause
)
