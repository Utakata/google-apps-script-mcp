/**
 * Google Apps Script MCP Server DXT Builder - STABLE版
 * 安定動作確認済みDXTファイル作成スクリプト
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Google Apps Script MCP Server STABLE.dxt 作成開始...');

const projectDir = process.cwd();
const outputFile = 'google-apps-script-mcp-STABLE.dxt';

// 安定版DXTに含めるファイル
const stableFiles = [
  'manifest.json',
  'package.json',
  'src/index-stable-fixed.js'
];

console.log('📁 安定版ファイル確認中...');

// ファイル存在確認
for (const file of stableFiles) {
  const filePath = path.join(projectDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 必須ファイルが見つかりません: ${file}`);
    process.exit(1);
  }
  console.log(`✅ ${file} - 確認完了`);
}

// DXTファイル作成
console.log('📦 DXTファイル作成中...');

try {
  // PowerShellコマンドでZIPファイルとして作成
  const { execSync } = require('child_process');
  
  // 一時ディレクトリ作成
  const tempDir = path.join(projectDir, 'temp-stable-dxt');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
  fs.mkdirSync(tempDir);
  
  // 必要ファイルをコピー
  for (const file of stableFiles) {
    const srcPath = path.join(projectDir, file);
    const destDir = path.join(tempDir, path.dirname(file));
    
    // ディレクトリ作成
    fs.mkdirSync(destDir, { recursive: true });
    
    const destPath = path.join(tempDir, file);
    fs.copyFileSync(srcPath, destPath);
    console.log(`📋 コピー完了: ${file}`);
  }
  
  // PowerShellでZIP作成
  const zipCmd = `Compress-Archive -Path "${tempDir}\\*" -DestinationPath "${path.join(projectDir, outputFile.replace('.dxt', '.zip'))}" -Force`;
  execSync(zipCmd, { shell: 'powershell.exe' });
  
  // 拡張子を.dxtに変更
  const zipFile = path.join(projectDir, outputFile.replace('.dxt', '.zip'));
  const dxtFile = path.join(projectDir, outputFile);
  
  if (fs.existsSync(zipFile)) {
    fs.renameSync(zipFile, dxtFile);
    console.log(`✅ ${outputFile} 作成完了`);
    
    // ファイルサイズ表示
    const stats = fs.statSync(dxtFile);
    console.log(`📊 ファイルサイズ: ${(stats.size / 1024).toFixed(2)} KB`);
  }
  
  // 一時ディレクトリ削除
  fs.rmSync(tempDir, { recursive: true });
  
  console.log('🎉 Google Apps Script MCP Server STABLE.dxt 作成完了！');
  console.log('📌 このファイルをClaude Desktopで使用できます');
  
} catch (error) {
  console.error('❌ DXTファイル作成エラー:', error.message);
  process.exit(1);
}
