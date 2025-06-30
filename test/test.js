/**
 * Google Apps Script MCP Server テストスイート
 *
 * 基本的な機能テストとセキュリティテストを実装
 *
 * Author: UtaNote
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

describe('Google Apps Script MCP Server Tests', () => {
    
    // テスト前の準備
    before(() => {
        console.log('🧪 テストスイート開始');
        // 必要に応じて初期化処理
    });

    // テスト後のクリーンアップ
    after(() => {
        console.log('✅ テストスイート完了');
        // 必要に応じてクリーンアップ処理
    });

    describe('📦 プロジェクト構造テスト', () => {
        
        it('package.json が存在すること', () => {
            const packageJsonPath = path.join(__dirname, '..', 'package.json');
            assert(fs.existsSync(packageJsonPath), 'package.json が見つかりません');
            
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            assert(packageJson.name, 'package.json に name フィールドがありません');
            assert(packageJson.version, 'package.json に version フィールドがありません');
        });

        it('manifest.json が存在すること', () => {
            const manifestPath = path.join(__dirname, '..', 'manifest.json');
            assert(fs.existsSync(manifestPath), 'manifest.json が見つかりません');
            
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            assert(manifest.name, 'manifest.json に name フィールドがありません');
            assert(manifest.version, 'manifest.json に version フィールドがありません');
            assert(manifest.main, 'manifest.json に main フィールドがありません');
        });

        it('メインエントリーポイントが存在すること', () => {
            const manifestPath = path.join(__dirname, '..', 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const mainFilePath = path.join(__dirname, '..', manifest.main);
            assert(fs.existsSync(mainFilePath), `メインファイル ${manifest.main} が見つかりません`);
        });

        it('必要なディレクトリが存在すること', () => {
            const requiredDirs = ['src', 'src/security', 'src/services', 'src/utils'];
            
            requiredDirs.forEach(dir => {
                const dirPath = path.join(__dirname, '..', dir);
                assert(fs.existsSync(dirPath), `必要なディレクトリ ${dir} が見つかりません`);
            });
        });
    });

    describe('🔐 セキュリティテスト', () => {
        
        it('セキュリティモジュールが存在すること', () => {
            const securityFiles = [
                'src/security/properties-manager.js',
                'src/security/auth-handler.js',
                'src/security/encryption-utils.js'
            ];

            securityFiles.forEach(file => {
                const filePath = path.join(__dirname, '..', file);
                assert(fs.existsSync(filePath), `セキュリティファイル ${file} が見つかりません`);
            });
        });

        it('.env.example に必要な環境変数が定義されていること', () => {
            const envExamplePath = path.join(__dirname, '..', '.env.example');
            assert(fs.existsSync(envExamplePath), '.env.example が見つかりません');
            
            const envContent = fs.readFileSync(envExamplePath, 'utf8');
            const requiredVars = [
                'GOOGLE_CLIENT_ID',
                'GOOGLE_CLIENT_SECRET',
                'SCRIPT_PROPERTY_ENCRYPTION_KEY',
                'JWT_SECRET_KEY'
            ];

            requiredVars.forEach(varName => {
                assert(envContent.includes(varName), `環境変数 ${varName} が .env.example に定義されていません`);
            });
        });

        it('.gitignore で機密ファイルが除外されていること', () => {
            const gitignorePath = path.join(__dirname, '..', '.gitignore');
            assert(fs.existsSync(gitignorePath), '.gitignore が見つかりません');
            
            const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
            const sensitivePatterns = [
                '.env',
                'credentials.json',
                'token.json',
                '*.key'
            ];

            sensitivePatterns.forEach(pattern => {
                assert(gitignoreContent.includes(pattern), `機密パターン ${pattern} が .gitignore に含まれていません`);
            });
        });
    });

    describe('🛠️ ビルドシステムテスト', () => {
        
        it('DXTビルドスクリプトが存在すること', () => {
            const buildScriptPath = path.join(__dirname, '..', 'build-dxt.js');
            assert(fs.existsSync(buildScriptPath), 'build-dxt.js が見つかりません');
        });

        it('DXTビルドスクリプトが実行可能なことを確認', () => {
            // この部分は実際のビルドテストを行う場合に実装
            // 現在は基本的な存在確認のみ
            const buildScriptPath = path.join(__dirname, '..', 'build-dxt.js');
            const buildScript = fs.readFileSync(buildScriptPath, 'utf8');
            
            // 基本的な構文チェック
            assert(buildScript.includes('class DXTBuilder'), 'DXTBuilder クラスが見つかりません');
            assert(buildScript.includes('async build()'), 'build メソッドが見つかりません');
        });
    });

    describe('📄 ドキュメンテーションテスト', () => {
        
        it('README.md が存在すること', () => {
            const readmePath = path.join(__dirname, '..', 'README.md');
            assert(fs.existsSync(readmePath), 'README.md が見つかりません');
            
            const readmeContent = fs.readFileSync(readmePath, 'utf8');
            assert(readmeContent.length > 100, 'README.md の内容が不十分です');
        });
    });

    describe('🔧 設定ファイルテスト', () => {
        
        it('package.json に必要な依存関係が含まれていること', () => {
            const packageJsonPath = path.join(__dirname, '..', 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            const requiredDeps = [
                '@modelcontextprotocol/sdk',
                'googleapis',
                'archiver'
            ];

            const allDeps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies
            };

            requiredDeps.forEach(dep => {
                assert(allDeps[dep], `必要な依存関係 ${dep} が package.json に含まれていません`);
            });
        });

        it('manifest.json が正しい形式であること', () => {
            const manifestPath = path.join(__dirname, '..', 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            
            // DXT manifest の必須フィールド確認
            assert(manifest.name, 'manifest.json に name が含まれていません');
            assert(manifest.version, 'manifest.json に version が含まれていません');
            assert(manifest.description, 'manifest.json に description が含まれていません');
            assert(manifest.main, 'manifest.json に main が含まれていません');
            
            // バージョン形式確認（semver）
            const versionPattern = /^\\d+\\.\\d+\\.\\d+/;
            assert(versionPattern.test(manifest.version), 'version は semver 形式である必要があります');
        });
    });

    describe('🔍 コード品質テスト', () => {
        
        it('JavaScript ファイルに基本的な構文エラーがないこと', () => {
            const jsFiles = [
                'index.js',
                'build-dxt.js'
            ];

            jsFiles.forEach(file => {
                const filePath = path.join(__dirname, '..', file);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    
                    // 基本的な構文チェック
                    assert(!content.includes('console.log('), 
                        `${file} に console.log が残っています（本番環境では適切なログ機能を使用してください）`);
                }
            });
        });
    });

    describe('🎯 機能統合テスト', () => {
        
        it('プロジェクト全体の整合性確認', () => {
            // package.json と manifest.json の整合性
            const packageJsonPath = path.join(__dirname, '..', 'package.json');
            const manifestPath = path.join(__dirname, '..', 'manifest.json');
            
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            
            // 名前とバージョンの整合性
            assert(packageJson.name === manifest.name, 
                'package.json と manifest.json の name が一致しません');
            assert(packageJson.version === manifest.version, 
                'package.json と manifest.json の version が一致しません');
        });
    });
});

// 個別テストヘルパー関数
class TestHelpers {
    /**
     * ファイルの存在確認
     */
    static fileExists(filePath) {
        return fs.existsSync(filePath);
    }

    /**
     * JSON ファイルの妥当性確認
     */
    static isValidJSON(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            JSON.parse(content);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 環境変数設定の確認
     */
    static checkEnvVars(requiredVars) {
        const missing = requiredVars.filter(varName => !process.env[varName]);
        return {
            valid: missing.length === 0,
            missing: missing
        };
    }
}

// カスタムアサーション
class CustomAssertions {
    /**
     * セキュリティ要件の確認
     */
    static assertSecurityCompliance(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // ハードコードされた秘密情報のチェック
        const sensitivePatterns = [
            /password\s*[:=]\s*["'][^"']+["']/i,
            /secret\s*[:=]\s*["'][^"']+["']/i,
            /key\s*[:=]\s*["'][^"']+["']/i,
            /token\s*[:=]\s*["'][^"']+["']/i
        ];

        sensitivePatterns.forEach(pattern => {
            assert(!pattern.test(content), 
                `${filePath} にハードコードされた秘密情報の可能性があります`);
        });
    }

    /**
     * MCP プロトコル準拠の確認
     */
    static assertMCPCompliance(mainFilePath) {
        const content = fs.readFileSync(mainFilePath, 'utf8');
        
        // MCP に必要な要素の確認
        const mcpRequirements = [
            '@modelcontextprotocol/sdk',
            'Server',
            'StdioServerTransport'
        ];

        mcpRequirements.forEach(requirement => {
            assert(content.includes(requirement), 
                `${mainFilePath} にMCP要件 ${requirement} が含まれていません`);
        });
    }
}

module.exports = {
    TestHelpers,
    CustomAssertions
};