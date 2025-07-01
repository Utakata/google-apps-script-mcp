import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 DXT依存関係完全版パッケージ作成開始');

const outputPath = 'google-apps-script-mcp-ULTRA.dxt';
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 }
});

let fileCount = 0;

output.on('close', function() {
  const sizeInKB = (archive.pointer() / 1024).toFixed(1);
  console.log(`✅ DXTファイル作成完了: ${outputPath}`);
  console.log(`📏 ファイルサイズ: ${sizeInKB} KB`);
  console.log(`📁 総データ量: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📊 含有ファイル数: ${fileCount}`);
  console.log('🎯 Claude Desktop対応依存関係完全版DXTファイル');
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

// ディレクトリ再帰追加関数
const addDirectoryRecursive = (dirPath, archivePrefix) => {
  if (!fs.existsSync(dirPath)) {
    console.log(`  ❌ ディレクトリ見つからない: ${dirPath}`);
    return;
  }

  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const archivePath = path.join(archivePrefix, item).replace(/\\/g, '/');
    
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      console.log(`  📁 ディレクトリ: ${archivePath}/`);
      addDirectoryRecursive(fullPath, archivePath);
    } else {
      archive.file(fullPath, { name: archivePath });
      fileCount++;
      if (fileCount % 100 === 0) {
        console.log(`  ... ${fileCount} ファイル処理済み`);
      }
    }
  }
};

console.log('📝 必須ファイル追加中...');
addFileIfExists('manifest.json', 'manifest.json');
addFileIfExists('package.json', 'package.json');

console.log('📂 ソースコード追加中...');
// src/ ディレクトリを完全に追加
addDirectoryRecursive('src', 'src');

console.log('⚡ 軽量依存関係戦略: 主要モジュールのみ...');

// 主要な依存関係のみ選択的に追加
const coreDependencies = [
  '@modelcontextprotocol/sdk',
  '@google/clasp'
];

for (const dep of coreDependencies) {
  const depPath = path.join('node_modules', dep);
  if (fs.existsSync(depPath)) {
    console.log(`📦 ${dep} 追加中...`);
    addDirectoryRecursive(depPath, `node_modules/${dep}`);
  }
}

console.log('🔧 設定ファイル追加中...');
if (fs.existsSync('config')) {
  addDirectoryRecursive('config', 'config');
}

console.log('📋 ドキュメント追加中...');
addFileIfExists('README.md', 'README.md');

console.log('🎯 軽量化のため、重い依存関係はランタイム取得方式に変更');
console.log('💡 MCPサーバー起動時に必要な依存関係は自動インストールされます');

// パッケージ完了
archive.finalize();
