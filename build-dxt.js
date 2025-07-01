/**
 * DXT Package Builder for Google Apps Script MCP Server (Clasp統合版)
 * 
 * Claude Desktop用DXTパッケージを生成するビルドスクリプト
 * Clasp統合機能を含む完全版のMCPサーバーをパッケージ化
 * 
 * Author: Utakata
 * Session: google-apps-script-mcp-20250630-002
 * License: MIT
 */

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DXTBuilder {
    constructor() {
        this.projectRoot = __dirname;
        this.outputDir = path.join(this.projectRoot, 'dist');
        this.dxtFileName = 'google-apps-script-mcp-v1.1.0-clasp.dxt';
        this.packageInfo = this.loadPackageInfo();
    }

    /**
     * package.jsonから情報を読み込み
     */
    loadPackageInfo() {
        try {
            const packagePath = path.join(this.projectRoot, 'package.json');
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            return packageData;
        } catch (error) {
            console.error('❌ package.json読み込みエラー:', error.message);
            process.exit(1);
        }
    }

    /**
     * 出力ディレクトリの準備
     */
    async prepareOutputDirectory() {
        try {
            if (fs.existsSync(this.outputDir)) {
                fs.rmSync(this.outputDir, { recursive: true, force: true });
            }
            fs.mkdirSync(this.outputDir, { recursive: true });
            console.log('✅ 出力ディレクトリを準備しました');
        } catch (error) {
            console.error('❌ 出力ディレクトリ準備エラー:', error.message);
            throw error;
        }
    }

    /**
     * DXTパッケージ用manifest.jsonを生成
     */
    generateDXTManifest() {
        const dxtManifest = {
            schema_version: "0.1.0",
            name: this.packageInfo.name,
            version: this.packageInfo.version,
            description: this.packageInfo.description,
            main: "src/index-clasp-integrated.js", // Clasp統合版をメインに設定
            author: this.packageInfo.author,
            license: this.packageInfo.license,
            
            // DXT固有設定
            dxt: {
                type: "mcp-server",
                runtime: "node",
                entry_point: "src/index-clasp-integrated.js",
                node_version: ">=18.0.0",
                install_command: "npm install",
                start_command: "npm start"
            },

            // Clasp統合機能のキャパビリティ
            capabilities: {
                tools: [
                    // Clasp統合ツール
                    "clasp_setup",
                    "clasp_create", 
                    "clasp_clone",
                    "clasp_pull",
                    "clasp_push_and_deploy",
                    "clasp_list",
                    
                    // 既存のGAS APIツール
                    "create_gas_project",
                    "list_gas_projects",
                    "get_gas_project", 
                    "update_gas_project",
                    "create_gas_file",
                    "get_gas_file",
                    "update_gas_file",
                    "execute_gas_function",
                    "deploy_gas_webapp",
                    "manage_gas_triggers",
                    "get_gas_logs",
                    "manage_gas_libraries"
                ],
                features: [
                    "oauth2_authentication",
                    "project_management",
                    "script_execution", 
                    "deployment_automation",
                    "trigger_management",
                    "logging_monitoring",
                    "library_management",
                    "clasp_cli_integration",
                    "environment_switching",
                    "local_development"
                ]
            },

            // 環境要件
            requirements: {
                node: ">=18.0.0",
                npm: ">=8.0.0",
                dependencies: this.packageInfo.dependencies
            },

            // セットアップ情報
            setup: {
                env_vars: [
                    "GOOGLE_CLIENT_ID",
                    "GOOGLE_CLIENT_SECRET",
                    "GOOGLE_REDIRECT_URI"
                ],
                instructions: [
                    "npm install でパッケージをインストール",
                    "Google Cloud Consoleでプロジェクトを作成",
                    "OAuth2認証情報を設定",
                    ".env ファイルを設定",
                    "clasp_setup ツールでCLI統合を設定"
                ]
            },

            // メタデータ
            metadata: {
                repository: this.packageInfo.repository?.url,
                homepage: this.packageInfo.homepage,
                bugs: this.packageInfo.bugs?.url,
                keywords: this.packageInfo.keywords,
                build_date: new Date().toISOString(),
                build_version: "1.1.0-clasp"
            }
        };

        return dxtManifest;
    }

    /**
     * DXTパッケージに含めるファイルの一覧
     */
    getIncludeFiles() {
        return [
            // メインファイル
            'src/index-clasp-integrated.js',  // Clasp統合版をメイン
            'src/index.js',                   // API専用版も含める
            'src/index-security.js',          // セキュリティ版も含める
            
            // 認証関連
            'src/auth/google-auth.js',
            
            // サービス
            'src/services/gas-api.js',
            'src/services/clasp-service-es6.js',  // ES6版
            'src/services/clasp-service.js',      // CommonJS版
            'src/services/security.js',
            
            // ユーティリティ
            'src/utils/logger.js',
            'src/utils/validation.js',
            'src/utils/formatters.js',
            
            // 設定ファイル
            'package.json',
            '.env.example',
            'README.md',
            
            // ドキュメント
            'docs/',
            
            // 設定
            'config/',
            
            // テスト（オプション）
            'test/'
        ];
    }

    /**
     * 除外するファイル/ディレクトリの一覧
     */
    getExcludePatterns() {
        return [
            '.git/**',
            '.gitignore',
            'node_modules/**',
            'dist/**',
            'build/**',
            '.env',
            '*.log',
            'coverage/**',
            '.nyc_output/**',
            'package-clasp.json',  // 作業用ファイルは除外
            'build-dxt.js'         // ビルドスクリプト自体は除外
        ];
    }

    /**
     * ファイルが除外対象かチェック
     */
    isExcluded(filePath) {
        const excludePatterns = this.getExcludePatterns();
        return excludePatterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
            return regex.test(filePath);
        });
    }

    /**
     * ディレクトリを再帰的にアーカイブに追加
     */
    addDirectoryToArchive(archive, dirPath, basePath = '') {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const relativePath = path.join(basePath, file);
            
            // 除外チェック
            if (this.isExcluded(relativePath)) {
                console.log(`⏭️  除外: ${relativePath}`);
                continue;
            }
            
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // ディレクトリの場合は再帰的に処理
                this.addDirectoryToArchive(archive, fullPath, relativePath);
            } else {
                // ファイルの場合はアーカイブに追加
                console.log(`📄 追加: ${relativePath}`);
                archive.file(fullPath, { name: relativePath });
            }
        }
    }

    /**
     * DXTパッケージをビルド
     */
    async buildDXT() {
        console.log('🚀 DXTパッケージビルド開始 (Clasp統合版)');
        console.log(`📦 バージョン: ${this.packageInfo.version}`);
        console.log(`📝 説明: ${this.packageInfo.description}`);
        
        try {
            // 出力ディレクトリ準備
            await this.prepareOutputDirectory();
            
            // DXTマニフェスト生成
            const dxtManifest = this.generateDXTManifest();
            const manifestPath = path.join(this.outputDir, 'dxt-manifest.json');
            fs.writeFileSync(manifestPath, JSON.stringify(dxtManifest, null, 2));
            console.log('✅ DXTマニフェストを生成しました');
            
            // ZIPアーカイブ作成
            const outputPath = path.join(this.outputDir, this.dxtFileName);
            const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            // アーカイブイベント設定
            archive.on('error', (err) => {
                throw err;
            });
            
            archive.on('warning', (err) => {
                if (err.code === 'ENOENT') {
                    console.warn('⚠️ ', err);
                } else {
                    throw err;
                }
            });
            
            archive.pipe(output);
            
            // DXTマニフェストを追加
            archive.file(manifestPath, { name: 'dxt-manifest.json' });
            
            // プロジェクトファイルを追加
            console.log('📁 プロジェクトファイルを追加中...');
            this.addDirectoryToArchive(archive, this.projectRoot);
            
            // アーカイブ完了
            await archive.finalize();
            
            // 統計情報
            const stats = fs.statSync(outputPath);
            const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
            
            console.log('');
            console.log('✅ DXTパッケージ生成完了!');
            console.log(`📦 ファイル: ${this.dxtFileName}`);
            console.log(`📏 サイズ: ${sizeInMB} MB`);
            console.log(`📁 出力先: ${outputPath}`);
            console.log('');
            console.log('🔧 主な機能:');
            console.log('  ✨ Clasp CLI統合 (setup/create/clone/pull/push/deploy/list)');
            console.log('  🔐 Google Apps Script API操作');
            console.log('  🚀 プロジェクト管理・デプロイ自動化');
            console.log('  ⚡ トリガー・ライブラリ管理');
            console.log('  📊 実行ログ・監視機能');
            console.log('  🔄 環境別設定切替');
            console.log('');
            console.log('📋 使用方法:');
            console.log('  1. Claude Desktop でこのDXTファイルをインポート');
            console.log('  2. MCP設定で環境変数を設定');
            console.log('  3. clasp_setup ツールでCLI環境をセットアップ');
            console.log('  4. 各種ツールでGoogle Apps Scriptを管理・操作');
            
        } catch (error) {
            console.error('❌ DXTビルドエラー:', error.message);
            throw error;
        }
    }

    /**
     * メイン実行
     */
    async run() {
        try {
            await this.buildDXT();
            process.exit(0);
        } catch (error) {
            console.error('❌ ビルド失敗:', error);
            process.exit(1);
        }
    }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
    const builder = new DXTBuilder();
    builder.run();
}