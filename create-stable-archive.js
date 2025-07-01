const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createStableDXT() {
  console.log('🚀 Google Apps Script MCP Server STABLE.dxt 作成開始...');
  
  const outputPath = 'google-apps-script-mcp-STABLE.dxt';
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  // エラーハンドリング
  output.on('close', () => {
    const sizeKB = (archive.pointer() / 1024).toFixed(2);
    console.log(`✅ ${outputPath} 作成完了`);
    console.log(`📊 ファイルサイズ: ${sizeKB} KB`);
    console.log('🎉 安定版DXTファイル作成完了！');
  });
  
  archive.on('error', (err) => {
    console.error('❌ アーカイブエラー:', err);
    process.exit(1);
  });
  
  archive.pipe(output);
  
  // 必要ファイルを追加
  console.log('📋 ファイル追加中...');
  
  // manifest.json
  archive.file('manifest.json', { name: 'manifest.json' });
  console.log('✅ manifest.json 追加');
  
  // package.json
  archive.file('package.json', { name: 'package.json' });
  console.log('✅ package.json 追加');
  
  // index-stable-fixed.js
  archive.file('src/index-stable-fixed.js', { name: 'src/index-stable-fixed.js' });
  console.log('✅ src/index-stable-fixed.js 追加');
  
  // アーカイブ完了
  await archive.finalize();
}

createStableDXT().catch(console.error);
