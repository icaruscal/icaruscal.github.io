@echo off
setlocal EnableExtensions

:: Run from the Ue4Export directory (where Ue4Export.exe lives).
:: Usage: export.bat <IcarusInstallDir> <ExportDir>
:: Tested with Ue4Export v4.2.1 (https://github.com/CrystalFerrai/Ue4Export/releases)
:: Icarus uses UE4_27
::
:: Copy image_files.txt and all_text_files.txt next to this script first.

if "%~1"=="" goto usage
if "%~2"=="" goto usage

set "ICARUS_DIR=%~f1"
set "OUT_DIR=%~f2"
set "SCRIPT_DIR=%~dp0"
set "UE4EXPORT=%CD%\Ue4Export.exe"
set "ENGINE=UE4_27"
set "IMAGE_LIST=%SCRIPT_DIR%image_files.txt"
set "TEXT_LIST=%SCRIPT_DIR%all_text_files.txt"

if not exist "%UE4EXPORT%" (
    echo ERROR: Ue4Export.exe not found in current directory "%CD%"
    echo Run this script from the Ue4Export directory.
    exit /b 1
)
if not exist "%IMAGE_LIST%" (
    echo ERROR: Missing asset list "%IMAGE_LIST%"
    exit /b 1
)
if not exist "%TEXT_LIST%" (
    echo ERROR: Missing asset list "%TEXT_LIST%"
    exit /b 1
)
if not exist "%ICARUS_DIR%\Icarus\Content\Paks" (
    echo ERROR: Icarus Paks not found under "%ICARUS_DIR%"
    echo Expected: "%ICARUS_DIR%\Icarus\Content\Paks"
    exit /b 1
)
if not exist "%ICARUS_DIR%\Icarus\Content\Data" (
    echo ERROR: Icarus Data not found under "%ICARUS_DIR%"
    echo Expected: "%ICARUS_DIR%\Icarus\Content\Data"
    exit /b 1
)

echo Exporting textures from Paks...
"%UE4EXPORT%" "%ICARUS_DIR%\Icarus\Content\Paks" %ENGINE% "%IMAGE_LIST%" "%OUT_DIR%"
if errorlevel 1 exit /b 1

echo Exporting data tables from Data...
"%UE4EXPORT%" "%ICARUS_DIR%\Icarus\Content\Data" %ENGINE% "%TEXT_LIST%" "%OUT_DIR%\data"
if errorlevel 1 exit /b 1

for /D %%G in ("%OUT_DIR%\data\*") do move "%%~G" "%OUT_DIR%\"
rmdir "%OUT_DIR%\data"

echo Done. Export written to "%OUT_DIR%"
pause
exit /b 0

:usage
echo Usage: %~nx0 ^<IcarusInstallDir^> ^<ExportDir^>
echo.
echo   Run from the Ue4Export directory (where Ue4Export.exe is).
echo.
echo   IcarusInstallDir  Game install root, e.g.
echo                     C:\Games\Steam\steamapps\common\Icarus
echo   ExportDir         Output folder for exported assets
echo.
echo Example:
echo   %~nx0 "C:\Games\Steam\steamapps\common\Icarus" "D:\IC_Export"
echo.
pause
exit /b 1
