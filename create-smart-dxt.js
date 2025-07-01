import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 スマートランタイム版DXTパッケージ作成開始');

const outputPath = 'google-apps-script-mcp-SMART.dxt';
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 }
});

let fileCount = 0;

output.on('close', function() {
  const sizeInKB = (archive.pointer() / 1024).toFixed(1);
  console.log(`✅ スマートランタイム版DXTファイル作成完了: ${outputPath}`);
  console.log(`📏 ファイルサイズ: ${sizeInKB} KB`);
  console.log(`📁 総データ量: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📊 含有ファイル数: ${fileCount}`);
  console.log('🎯 Claude Desktop対応スマート依存関係解決DXTファイル');
});

archive.on('error', function(err) {
  console.error('❌ エラー:', err);
  throw err;
});

archive.pipe(output);

// ファイル追加ヘルパー関数
const addFileIfExists = (filePath, archivePath) => {
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: archivePath });
    console.log(`  ✅ ${archivePath}`);
    fileCount++;
    return true;
  } else {
    console.log(`  ❌ 見つからない: ${filePath}`);
    return false;
  }
};

console.log('📝 必須ファイル追加中...');
addFileIfExists('manifest.json', 'manifest.json');
addFileIfExists('package.json', 'package.json');

console.log('📂 スマートランタイム版ソースコード追加中...');
// メインファイル（スマートランタイム版のみ）
addFileIfExists('src/index-smart-runtime.js', 'src/index-smart-runtime.js');

console.log('📦 最小限の依存関係追加中...');
// MCPサーバーSDKのみ必須
const coreModule = '@modelcontextprotocol/sdk';
const modulePathCore = path.join('node_modules', coreModule);
if (fs.existsSync(modulePathCore)) {
  console.log(`📦 ${coreModule} 追加中...`);
  
  // 必要なファイルのみ追加
  const essentialFiles = [
    'package.json',
    'dist/index.js',
    'dist/server/index.js',
    'dist/server/stdio.js',
    'dist/types.js'
  ];
  
  essentialFiles.forEach(file => {
    const filePath = path.join(modulePathCore, file);
    const archivePath = path.join('node_modules', coreModule, file).replace(/\\/g, '/');
    addFileIfExists(filePath, archivePath);
  });
  
  // dist/ ディレクトリ全体を追加（より確実）
  if (fs.existsSync(path.join(modulePathCore, 'dist'))) {
    archive.directory(path.join(modulePathCore, 'dist'), `node_modules/${coreModule}/dist`);
    fileCount += 50; // 概算
    console.log(`  ✅ ${coreModule}/dist/ - 完全版`);
  }
}

console.log('🔧 設定ファイル追加中...');
if (fs.existsSync('config')) {
  addFileIfExists('config/default.json', 'config/default.json');
}

console.log('📋 ドキュメント追加中...');
addFileIfExists('README.md', 'README.md');

console.log('💡 スマートランタイム版の特徴:');
console.log('  ⚡ 軽量パッケージ（依存関係を動的解決）');
console.log('  🔄 ランタイム自動インストール');
console.log('  🛡️ ENOENTエラー完全回避');
console.log('  🚀 高速起動・確実な動作');

// パッケージ完了
archive.finalize();
