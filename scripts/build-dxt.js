/**
 * Google Apps Script MCP Server DXT ビルドスクリプト
 * 
 * DXTファイル（Anthropic Desktop Extensions）を生成するスクリプト
 * 
 * Author: UtaNote
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import dayjs from 'dayjs';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DXTBuilder {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.outputDir = path.join(this.rootDir, 'dist');
    this.manifestPath = path.join(this.rootDir, 'manifest.json');
    this.packagePath = path.join(this.rootDir, 'package.json');
  }

  /**
   * ビルドプロセスを実行
   */
  async build() {
    try {
      console.log(chalk.blue('🔨 Google Apps Script MCP Server DXT ビルド開始'));
      console.log(chalk.gray(`📁 プロジェクトディレクトリ: ${this.rootDir}`));

      // マニフェストファイルを読み込み
      const manifest = await this.loadManifest();
      const pkg = await this.loadPackage();

      // バージョン情報を表示
      console.log(chalk.green(`📦 ${manifest.name} v${manifest.version}`));
      console.log(chalk.gray(`📝 ${manifest.description}`));

      // 出力ディレクトリを準備
      await this.prepareOutputDirectory();

      // 必要なファイルをコピー
      await this.copyFiles(manifest);

      // package.jsonを調整
      await this.adjustPackageJson(pkg);

      // DXTファイルを生成
      const dxtPath = await this.createDXTArchive(manifest);

      console.log(chalk.green('✅ DXTファイルの生成が完了しました'));
      console.log(chalk.yellow(`📁 出力先: ${dxtPath}`));
      
      // ファイル情報を表示
      await this.displayFileInfo(dxtPath);

      return dxtPath;

    } catch (error) {
      console.error(chalk.red('❌ ビルドエラー:'), error.message);
      throw error;
    }
  }

  /**
   * マニフェストファイルを読み込み
   */
  async loadManifest() {
    if (!await fs.pathExists(this.manifestPath)) {
      throw new Error('manifest.json が見つかりません');
    }

    const manifest = await fs.readJson(this.manifestPath);
    
    // 必須フィールドの検証
    const requiredFields = ['name', 'version', 'description'];
    for (const field of requiredFields) {
      if (!manifest[field]) {
        throw new Error(`manifest.json に必須フィールド '${field}' がありません`);
      }
    }

    return manifest;
  }

  /**
   * package.jsonを読み込み
   */
  async loadPackage() {
    if (!await fs.pathExists(this.packagePath)) {
      throw new Error('package.json が見つかりません');
    }

    return await fs.readJson(this.packagePath);
  }

  /**
   * 出力ディレクトリを準備
   */
  async prepareOutputDirectory() {
    const tempDir = path.join(this.outputDir, 'temp');
    
    // 一時ディレクトリをクリーンアップ
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }

    // ディレクトリを作成
    await fs.ensureDir(this.outputDir);
    await fs.ensureDir(tempDir);

    console.log(chalk.gray(`📁 一時ディレクトリを作成: ${tempDir}`));
    
    this.tempDir = tempDir;
  }

  /**
   * 必要なファイルをコピー
   */
  async copyFiles(manifest) {
    const includePatterns = manifest.build?.include || [
      'src/',
      'config/',
      'package.json',
      'README.md',
      'manifest.json'
    ];

    const excludePatterns = manifest.build?.exclude || [
      'node_modules/',
      '.git/',
      'test/',
      'docs/',
      '.env*',
      '*.log'
    ];

    console.log(chalk.blue('📋 ファイルをコピー中...'));

    let copiedCount = 0;
    
    for (const pattern of includePatterns) {
      const sourcePath = path.join(this.rootDir, pattern);
      const fileName = path.basename(pattern);
      const destPath = path.join(this.tempDir, fileName);

      try {
        if (await fs.pathExists(sourcePath)) {
          const stat = await fs.stat(sourcePath);
          
          if (stat.isDirectory()) {
            // ディレクトリの場合
            await fs.copy(sourcePath, destPath, {
              filter: (src) => {
                // 除外パターンをチェック
                const relativePath = path.relative(this.rootDir, src);
                return !excludePatterns.some(exclude => 
                  relativePath.includes(exclude.replace('/', ''))
                );
              }
            });
            
            const fileCount = await this.countFiles(destPath);
            copiedCount += fileCount;
            console.log(chalk.gray(`  📁 ${pattern} (${fileCount}ファイル)`));
          } else {
            // ファイルの場合
            await fs.copy(sourcePath, destPath);
            copiedCount++;
            console.log(chalk.gray(`  📄 ${fileName}`));
          }
        } else {
          console.log(chalk.yellow(`  ⚠️ ${pattern} が見つかりません（スキップ）`));
        }
      } catch (error) {
        console.error(chalk.red(`  ❌ ${pattern} のコピーに失敗: ${error.message}`));
      }
    }

    console.log(chalk.green(`✅ ${copiedCount}個のファイルをコピーしました`));
  }

  /**
   * package.jsonを調整
   */
  async adjustPackageJson(pkg) {
    // DXT用のpackage.jsonを作成
    const dxtPackage = {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      main: pkg.main,
      type: pkg.type,
      scripts: {
        start: pkg.scripts.start
      },
      keywords: pkg.keywords,
      author: pkg.author,
      license: pkg.license,
      dependencies: pkg.dependencies,
      engines: pkg.engines
    };

    const packagePath = path.join(this.tempDir, 'package.json');
    await fs.writeJson(packagePath, dxtPackage, { spaces: 2 });
    
    console.log(chalk.gray('📄 package.json を調整しました'));
  }

  /**
   * DXTアーカイブを作成
   */
  async createDXTArchive(manifest) {
    const outputFileName = manifest.build?.output || `${manifest.name}.dxt`;
    const outputPath = path.join(this.outputDir, outputFileName);

    // 既存ファイルを削除
    if (await fs.pathExists(outputPath)) {
      await fs.remove(outputPath);
    }

    console.log(chalk.blue('📦 DXTアーカイブを作成中...'));

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // 最大圧縮
      });

      output.on('close', () => {
        console.log(chalk.green(`✅ アーカイブ作成完了 (${archive.pointer()} bytes)`));
        resolve(outputPath);
      });

      archive.on('error', (err) => {
        console.error(chalk.red('❌ アーカイブエラー:'), err);
        reject(err);
      });

      archive.pipe(output);

      // 一時ディレクトリの内容をアーカイブに追加
      archive.directory(this.tempDir, false);

      archive.finalize();
    });
  }

  /**
   * ファイル数をカウント
   */
  async countFiles(dirPath) {
    if (!await fs.pathExists(dirPath)) {
      return 0;
    }

    let count = 0;
    const items = await fs.readdir(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = await fs.stat(itemPath);

      if (stat.isDirectory()) {
        count += await this.countFiles(itemPath);
      } else {
        count++;
      }
    }

    return count;
  }

  /**
   * ファイル情報を表示
   */
  async displayFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(chalk.blue('\n📊 DXTファイル情報:'));
      console.log(chalk.gray(`  📁 ファイル名: ${path.basename(filePath)}`));
      console.log(chalk.gray(`  📏 サイズ: ${sizeInMB} MB`));
      console.log(chalk.gray(`  📅 作成日時: ${dayjs(stats.birthtime).format('YYYY-MM-DD HH:mm:ss')}`));
      console.log('');
      
      console.log(chalk.yellow('💡 インストール方法:'));
      console.log(chalk.gray('  1. Claude Desktop を開く'));
      console.log(chalk.gray('  2. Settings > Extensions をクリック'));
      console.log(chalk.gray(`  3. "${path.basename(filePath)}" をドラッグ&ドロップ`));
      console.log(chalk.gray('  4. 環境変数を設定'));
      console.log(chalk.gray('  5. Claude Desktop を再起動'));
      console.log('');

    } catch (error) {
      console.error(chalk.red('❌ ファイル情報取得エラー:'), error.message);
    }
  }

  /**
   * クリーンアップ
   */
  async cleanup() {
    if (this.tempDir && await fs.pathExists(this.tempDir)) {
      await fs.remove(this.tempDir);
      console.log(chalk.gray('🧹 一時ファイルをクリーンアップしました'));
    }
  }
}

// ビルド実行
async function main() {
  const builder = new DXTBuilder();
  
  try {
    const dxtPath = await builder.build();
    
    console.log(chalk.green('🎉 ビルドが正常に完了しました!'));
    console.log(chalk.blue(`📦 DXTファイル: ${dxtPath}`));
    
  } catch (error) {
    console.error(chalk.red('💥 ビルドに失敗しました:'), error.message);
    process.exit(1);
  } finally {
    await builder.cleanup();
  }
}

// スクリプトが直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DXTBuilder };
