@echo off
chcp 65001 >nul
rem ---------------------------------------------------------------------------
rem  编译一键启动器（单文件 exe）
rem
rem  前置：.NET 8 SDK（dotnet 命令可用）
rem  产物：<sonolus version>\Sonolus 预览器.exe
rem
rem  想做成「不需要装 .NET」的版本，见 launcher\README.md 里的 self-contained 一行。
rem ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0.."

if not exist "launcher\SonolusPreview.csproj" (
    echo [错误] 找不到 launcher\SonolusPreview.csproj
    pause
    exit /b 1
)

echo [1/2] 发布（Release / win-x64 / 单文件）...
dotnet publish "launcher\SonolusPreview.csproj" -c Release -o "launcher\dist" -nologo
if errorlevel 1 (
    echo.
    echo [错误] 发布失败。
    pause
    exit /b 1
)

echo [2/2] 复制到应用根目录...
copy /y "launcher\dist\SonolusPreview.exe" "Sonolus 预览器.exe" >nul
if errorlevel 1 (
    echo [错误] 复制失败（目标文件可能正在运行）。
    pause
    exit /b 1
)

echo.
echo 完成：%~dp0..\Sonolus 预览器.exe
echo 双击即可启动（无控制台窗口，右键托盘图标退出）。
echo.
pause
exit /b 0
