@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0reset-db-with-postgis.ps1" %*
endlocal
