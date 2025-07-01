@echo off
echo 🚀 Google Apps Script MCP Server STABLE.dxt 作成開始...

set OUTPUT_FILE=google-apps-script-mcp-STABLE.dxt
set TEMP_DIR=temp-stable-dxt

echo 📁 一時ディレクトリ作成中...
if exist %TEMP_DIR% rmdir /s /q %TEMP_DIR%
mkdir %TEMP_DIR%
mkdir %TEMP_DIR%\src

echo 📋 必要ファイルをコピー中...
copy manifest.json %TEMP_DIR%\manifest.json
copy package.json %TEMP_DIR%\package.json
copy src\index-stable-fixed.js %TEMP_DIR%\src\index-stable-fixed.js

echo 📦 DXTファイル作成中...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%OUTPUT_FILE%.zip' -Force"

if exist %OUTPUT_FILE%.zip (
    ren %OUTPUT_FILE%.zip %OUTPUT_FILE%
    echo ✅ %OUTPUT_FILE% 作成完了
    
    for %%A in (%OUTPUT_FILE%) do (
        set /a SIZE=%%~zA/1024
        echo 📊 ファイルサイズ: !SIZE! KB
    )
) else (
    echo ❌ ZIP作成に失敗しました
    exit /b 1
)

echo 🧹 一時ディレクトリ削除中...
rmdir /s /q %TEMP_DIR%

echo 🎉 Google Apps Script MCP Server STABLE.dxt 作成完了！
echo 📌 このファイルをClaude Desktopで使用できます
