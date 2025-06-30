/**
 * Google Apps Script MCP Server DXT ビルドスクリプト
 *
 * DXTファイル（Anthropic Desktop Extensions）を生成するスクリプト
 *
 * Author: UtaNote
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

class DXTBuilder {
    constructor() {
        this.projectRoot = process.cwd();
        this.buildDir = path.join(this.projectRoot, 'build');
        this.manifestPath = path.join(this.projectRoot, 'manifest.json');
        this.outputPath = path.join(this.buildDir, 'google-apps-script-mcp.dxt');
    }

    /**
     * ビルドディレクトリの準備
     */
    prepareBuildDir() {
        console.log('📁 ビルドディレクトリを準備中...');
        
        if (fs.existsSync(this.buildDir)) {
            fs.rmSync(this.buildDir, { recursive: true, force: true });
        }
        fs.mkdirSync(this.buildDir, { recursive: true });
        
        console.log('✅ ビルドディレクトリ準備完了');
    }

    /**
     * マニフェストファイルの検証
     */
    validateManifest() {
        console.log('📄 マニフェストファイルを検証中...');
        
        if (!fs.existsSync(this.manifestPath)) {
            throw new Error('manifest.json が見つかりません');
        }

        try {
            const manifest = JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
            
            // 必須フィールドの確認
            const requiredFields = ['name', 'version', 'description', 'main'];
            for (const field of requiredFields) {
                if (!manifest[field]) {
                    throw new Error(`manifest.json に必須フィールド '${field}' がありません`);
                }
            }

            console.log(`✅ マニフェスト検証完了: ${manifest.name} v${manifest.version}`);
            return manifest;
            
        } catch (error) {
            throw new Error(`マニフェストファイルの解析エラー: ${error.message}`);
        }
    }

    /**
     * 必要なファイルの存在確認
     */
    validateRequiredFiles(manifest) {
        console.log('📦 必要なファイルを確認中...');
        
        const mainFile = path.join(this.projectRoot, manifest.main);
        if (!fs.existsSync(mainFile)) {
            throw new Error(`メインファイル '${manifest.main}' が見つかりません`);
        }

        // package.json の確認
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('package.json が見つかりません');
        }

        console.log('✅ 必要なファイル確認完了');
    }

    /**
     * DXTファイル（ZIPアーカイブ）の作成
     */
    async createDXTFile(manifest) {
        console.log('🔧 DXTファイルを作成中...');

        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(this.outputPath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // 最高圧縮
            });

            output.on('close', () => {
                const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
                console.log(`✅ DXTファイル作成完了: ${sizeInMB}MB`);
                resolve();
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);

            // ファイルを追加
            this.addFilesToArchive(archive, manifest);

            // アーカイブを確定
            archive.finalize();
        });
    }

    /**
     * アーカイブにファイルを追加
     */
    addFilesToArchive(archive, manifest) {
        console.log('📄 ファイルをアーカイブに追加中...');

        // 基本ファイル
        const coreFiles = [
            'manifest.json',
            'package.json',
            manifest.main,
            'README.md'
        ];

        // セキュリティ関連ファイル
        const securityFiles = [
            'src/security/properties-manager.js',
            'src/security/auth-handler.js',
            'src/security/encryption-utils.js'
        ];

        // サービスファイル
        const serviceFiles = [
            'src/services/gas-api.js',
            'src/utils/logger.js',
            'src/utils/validator.js'
        ];

        // すべてのファイルを追加
        [...coreFiles, ...securityFiles, ...serviceFiles].forEach(file => {
            const filePath = path.join(this.projectRoot, file);
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: file });
                console.log(`  ➕ ${file}`);
            } else {
                console.warn(`  ⚠️  ${file} が見つかりません (スキップ)`);
            }
        });

        // srcディレクトリ全体を追加（存在する場合）
        const srcDir = path.join(this.projectRoot, 'src');
        if (fs.existsSync(srcDir)) {
            archive.directory(srcDir, 'src');
            console.log('  ➕ src/ ディレクトリ');
        }

        // .env.example があれば追加
        const envExample = path.join(this.projectRoot, '.env.example');
        if (fs.existsSync(envExample)) {
            archive.file(envExample, { name: '.env.example' });
            console.log('  ➕ .env.example');
        }
    }

    /**
     * インストール手順の生成
     */
    generateInstallationGuide(manifest) {
        console.log('📋 インストール手順を生成中...');

        const guide = `# ${manifest.name} DXT インストール手順

## 前提条件
- Node.js 18以上
- Google Apps Script プロジェクトへのアクセス権
- Claude Desktop App

## インストール方法

### 1. DXTファイルのインストール
\`\`\`bash
# Claude Desktop AppでDXTファイルをインストール
# または以下のコマンドでManual インストール
dxt install google-apps-script-mcp.dxt
\`\`\`

### 2. 環境変数の設定
\`\`\`bash
# .envファイルを作成
cp .env.example .env

# 以下の環境変数を設定
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
SCRIPT_PROPERTY_ENCRYPTION_KEY=your_encryption_key
\`\`\`

### 3. Google Cloud Console設定
1. Google Cloud Consoleで新しいプロジェクトを作成
2. Google Apps Script API を有効化
3. OAuth 2.0 認証情報を作成
4. 承認済みリダイレクト URI を設定

### 4. Claude MCPサーバー設定
Claude Desktop Appの設定に以下を追加:
\`\`\`json
{
  "mcpServers": {
    "google-apps-script": {
      "command": "node",
      "args": ["path/to/google-apps-script-mcp/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your_client_id",
        "GOOGLE_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
\`\`\`

## セキュリティ機能

### スクリプトプロパティ管理
- 暗号化された設定値保存
- 安全なAPIキー管理
- ログ記録とアクセス制御

### 認証セキュリティ
- OAuth 2.0フロー
- トークンの自動更新
- セッション管理

## 利用可能なツール
- \`gas_create_project\`: プロジェクト作成
- \`gas_get_project\`: プロジェクト取得
- \`gas_update_file\`: ファイル更新
- \`gas_execute_function\`: 関数実行
- \`gas_manage_properties\`: プロパティ管理
- \`gas_deploy_web_app\`: Webアプリデプロイ

## サポート
- GitHub: https://github.com/Utakata/google-apps-script-mcp
- 問題報告: Issues ページまで
`;

        const guidePath = path.join(this.buildDir, 'INSTALLATION.md');
        fs.writeFileSync(guidePath, guide, 'utf8');
        console.log('✅ インストール手順生成完了');
    }

    /**
     * ビルド情報の出力
     */
    displayBuildInfo(manifest) {
        console.log('\n🎉 ビルド完了！');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📦 プロジェクト: ${manifest.name}`);
        console.log(`🏷️  バージョン: ${manifest.version}`);
        console.log(`📝 説明: ${manifest.description}`);
        console.log(`📁 出力先: ${this.outputPath}`);
        console.log(`📋 手順書: ${path.join(this.buildDir, 'INSTALLATION.md')}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n次のステップ:');
        console.log('1. DXTファイルをClaude Desktop Appにインストール');
        console.log('2. 環境変数を設定');
        console.log('3. Google Cloud Console設定');
        console.log('4. 利用開始！');
    }

    /**
     * メインビルド処理
     */
    async build() {
        try {
            console.log('🚀 Google Apps Script MCP DXTビルド開始\n');

            // 1. ビルドディレクトリ準備
            this.prepareBuildDir();

            // 2. マニフェスト検証
            const manifest = this.validateManifest();

            // 3. 必要ファイル確認
            this.validateRequiredFiles(manifest);

            // 4. DXTファイル作成
            await this.createDXTFile(manifest);

            // 5. インストール手順生成
            this.generateInstallationGuide(manifest);

            // 6. ビルド情報出力
            this.displayBuildInfo(manifest);

        } catch (error) {
            console.error('❌ ビルドエラー:', error.message);
            process.exit(1);
        }
    }
}

// コマンドライン引数の処理
if (require.main === module) {
    const builder = new DXTBuilder();
    
    // コマンドライン引数の確認
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
🛠️  Google Apps Script MCP DXTビルダー

使用方法:
  node build-dxt.js [オプション]

オプション:
  --help, -h     このヘルプメッセージを表示
  --verbose, -v  詳細ログを表示

例:
  node build-dxt.js
  node build-dxt.js --verbose
        `);
        process.exit(0);
    }

    // ビルド実行
    builder.build().catch(error => {
        console.error('💥 予期しないエラー:', error);
        process.exit(1);
    });
}

module.exports = DXTBuilder;