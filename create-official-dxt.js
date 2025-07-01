import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 DXT公式仕様準拠パッケージ作成開始');

const outputPath = 'google-apps-script-mcp-OFFICIAL.dxt';
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // 最高圧縮レベル
});

output.on('close', function() {
  const sizeInKB = (archive.pointer() / 1024).toFixed(1);
  console.log(`✅ DXTファイル作成完了: ${outputPath}`);
  console.log(`📏 ファイルサイズ: ${sizeInKB} KB`);
  console.log(`📁 総データ量: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  
  // ファイル情報表示
  const stats = fs.statSync(outputPath);
  console.log(`📊 作成日時: ${stats.birthtime}`);
  console.log('🎯 Claude Desktop対応公式仕様準拠DXTファイル');
});

archive.on('error', function(err) {
  console.error('❌ エラー:', err);
  throw err;
});

archive.pipe(output);

console.log('📝 必須ファイル追加中...');

// 必須ファイル
archive.file('manifest.json', { name: 'manifest.json' });
archive.file('package.json', { name: 'package.json' });

console.log('📂 ソースコード追加中...');
// ソースコード
archive.directory('src/', 'src/');

console.log('📦 依存関係追加中...');
// node_modules (選択的に追加)
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
  }
});

console.log('🔧 設定ファイル追加中...');
// 設定ファイル
if (fs.existsSync('config')) {
  archive.directory('config/', 'config/');
}

console.log('📋 ドキュメント追加中...');
// ドキュメント
if (fs.existsSync('README.md')) {
  archive.file('README.md', { name: 'README.md' });
}

// パッケージ完了
archive.finalize();
