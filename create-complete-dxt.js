import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 DXT完全版パッケージ作成開始');

const outputPath = 'google-apps-script-mcp-COMPLETE.dxt';
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 }
});

output.on('close', function() {
  const sizeInKB = (archive.pointer() / 1024).toFixed(1);
  console.log(`✅ DXTファイル作成完了: ${outputPath}`);
  console.log(`📏 ファイルサイズ: ${sizeInKB} KB`);
  console.log(`📁 総データ量: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  console.log('🎯 Claude Desktop対応完全版DXTファイル');
});

archive.on('error', function(err) {
  console.error('❌ エラー:', err);
  throw err;
});

archive.pipe(output);

console.log('📝 必須ファイル追加中...');
archive.file('manifest.json', { name: 'manifest.json' });
archive.file('package.json', { name: 'package.json' });

console.log('📂 個別ファイル詳細追加中...');

// src/ ディレクトリ内のファイルを個別に追加
const addFileIfExists = (filePath, archivePath) => {
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: archivePath });
    console.log(`  ✅ ${archivePath}`);
  } else {
    console.log(`  ❌ 見つからない: ${filePath}`);
  }
};

// メインファイル群
addFileIfExists('src/index.js', 'src/index.js');
addFileIfExists('src/index-clasp-integrated.js', 'src/index-clasp-integrated.js');
addFileIfExists('src/index-security.js', 'src/index-security.js');

// auth/ ディレクトリ
addFileIfExists('src/auth/google-auth.js', 'src/auth/google-auth.js');

// services/ ディレクトリ
addFileIfExists('src/services/clasp-service.js', 'src/services/clasp-service.js');
addFileIfExists('src/services/clasp-service-es6.js', 'src/services/clasp-service-es6.js');
addFileIfExists('src/services/gas-api.js', 'src/services/gas-api.js');
addFileIfExists('src/services/security.js', 'src/services/security.js');

// utils/ ディレクトリ
addFileIfExists('src/utils/validation.js', 'src/utils/validation.js');
addFileIfExists('src/utils/logger.js', 'src/utils/logger.js');

console.log('📦 必須依存関係追加中...');
const essentialModules = [
  '@modelcontextprotocol/sdk',
  '@google/clasp',
  'axios',
  'chalk',
  'dayjs',
  'fs-extra',
  'google-auth-library',
  'googleapis',
  'lodash',
  'node-fetch'
];

essentialModules.forEach(module => {
  const modulePath = path.join('node_modules', module);
  if (fs.existsSync(modulePath)) {
    archive.directory(modulePath, `node_modules/${module}`);
    console.log(`  ✅ ${module}`);
  } else {
    console.log(`  ❌ 見つからない: ${module}`);
  }
});

console.log('🔧 設定ファイル追加中...');
if (fs.existsSync('config')) {
  archive.directory('config/', 'config/');
  console.log('  ✅ config/');
}

console.log('📋 ドキュメント追加中...');
if (fs.existsSync('README.md')) {
  archive.file('README.md', { name: 'README.md' });
  console.log('  ✅ README.md');
}

// パッケージ完了
archive.finalize();
