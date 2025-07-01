import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

async function createStableDXT() {
  console.log('🚀 Google Apps Script MCP Server STABLE.dxt 作成開始...');
  
  const outputPath = 'google-apps-script-mcp-STABLE-FIXED.dxt';
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  return new Promise((resolve, reject) => {
    // エラーハンドリング
    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2);
      console.log(`✅ ${outputPath} 作成完了`);
      console.log(`📊 ファイルサイズ: ${sizeKB} KB`);
      console.log('🎉 安定版DXTファイル作成完了！');
      resolve();
    });
    
    archive.on('error', (err) => {
      console.error('❌ アーカイブエラー:', err);
      reject(err);
    });
    
    archive.pipe(output);
    
    // 必要ファイルを追加
    console.log('📋 ファイル追加中...');
    
    try {
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
      archive.finalize();
    } catch (error) {
      console.error('❌ ファイル追加エラー:', error);
      reject(error);
    }
  });
}

createStableDXT().catch(console.error);
