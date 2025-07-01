/**
 * ClaspService - ES6版
 * Google Apps Script Clasp CLI統合サービス
 * 
 * 開発環境とクラウド環境間でのプロジェクト同期、デプロイ管理を提供
 * 
 * Author: Utakata
 * Session: google-apps-script-mcp-20250630-002  
 * License: MIT
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ClaspService {
    constructor(options = {}) {
        this.workingDir = options.workingDir || process.cwd();
        this.environment = options.environment || 'development';
        this.logger = options.logger || console;
        this.timeout = options.timeout || 30000;
    }

    /**
     * Clasp環境をセットアップする
     * @param {Object} options - セットアップオプション
     * @returns {Promise<Object>} セットアップ結果
     */
    async setup(options = {}) {
        try {
            this.logger.info('🔧 Clasp環境をセットアップ中...');

            // Google Apps Script APIの有効化確認
            const loginStatus = await this.checkLoginStatus();
            
            if (!loginStatus.isLoggedIn) {
                return {
                    success: false,
                    error: 'Google Apps Scriptにログインしてください: clasp login',
                    action: 'login_required'
                };
            }

            // API有効化状況をチェック
            const apiStatus = await this.checkApiStatus();
            
            return {
                success: true,
                loginStatus,
                apiStatus,
                environment: this.environment,
                workingDir: this.workingDir,
                message: 'Clasp環境のセットアップが完了しました'
            };

        } catch (error) {
            this.logger.error('❌ Claspセットアップエラー:', error);
            return {
                success: false,
                error: error.message,
                action: 'setup_failed'
            };
        }
    }

    /**
     * 新しいGoogle Apps Scriptプロジェクトを作成
     * @param {Object} options - プロジェクト作成オプション
     * @returns {Promise<Object>} 作成結果
     */
    async create(options = {}) {
        try {
            const {
                title = 'New GAS Project',
                type = 'standalone',
                parentId = null,
                rootDir = null
            } = options;

            this.logger.info(`🚀 新しいプロジェクトを作成中: ${title}`);

            // コマンド構築
            let command = `clasp create --title "${title}" --type ${type}`;
            if (parentId) {
                command += ` --parentId ${parentId}`;
            }
            if (rootDir) {
                command += ` --rootDir ${rootDir}`;
            }

            const result = await this.executeCommand(command);

            if (result.success) {
                // .clasp.json ファイルを読み取ってプロジェクト情報を取得
                const claspConfig = await this.readClaspConfig();
                
                return {
                    success: true,
                    project: {
                        title,
                        type,
                        scriptId: claspConfig?.scriptId,
                        rootDir: claspConfig?.rootDir || '.',
                        parentId
                    },
                    output: result.stdout,
                    message: `プロジェクト "${title}" の作成が完了しました`
                };
            }

            return result;

        } catch (error) {
            this.logger.error('❌ プロジェクト作成エラー:', error);
            return {
                success: false,
                error: error.message,
                action: 'create_failed'
            };
        }
    }

    /**
     * 既存のGoogle Apps Scriptプロジェクトをクローン
     * @param {Object} options - クローンオプション  
     * @returns {Promise<Object>} クローン結果
     */
    async clone(options = {}) {
        try {
            const { scriptId, versionNumber = null } = options;

            if (!scriptId) {
                throw new Error('スクリプトIDが必要です');
            }

            this.logger.info(`📥 プロジェクトをクローン中: ${scriptId}`);

            let command = `clasp clone ${scriptId}`;
            if (versionNumber) {
                command += ` --versionNumber ${versionNumber}`;
            }

            const result = await this.executeCommand(command);

            if (result.success) {
                const claspConfig = await this.readClaspConfig();
                
                return {
                    success: true,
                    project: {
                        scriptId,
                        rootDir: claspConfig?.rootDir || '.',
                        versionNumber
                    },
                    output: result.stdout,
                    message: `プロジェクト ${scriptId} のクローンが完了しました`
                };
            }

            return result;

        } catch (error) {
            this.logger.error('❌ クローンエラー:', error);
            return {
                success: false,
                error: error.message,
                action: 'clone_failed'
            };
        }
    }

    /**
     * リモートからローカルにファイルをプル
     * @param {Object} options - プルオプション
     * @returns {Promise<Object>} プル結果
     */
    async pull(options = {}) {
        try {
            const { versionNumber = null } = options;

            this.logger.info('📥 リモートからファイルをプル中...');

            let command = 'clasp pull';
            if (versionNumber) {
                command += ` --versionNumber ${versionNumber}`;
            }

            const result = await this.executeCommand(command);

            if (result.success) {
                return {
                    success: true,
                    versionNumber,
                    output: result.stdout,
                    message: 'リモートからのプルが完了しました'
                };
            }

            return result;

        } catch (error) {
            this.logger.error('❌ プルエラー:', error);
            return {
                success: false,
                error: error.message,
                action: 'pull_failed'
            };
        }
    }

    /**
     * ローカルからリモートにプッシュしてデプロイ
     * @param {Object} options - プッシュ・デプロイオプション
     * @returns {Promise<Object>} プッシュ・デプロイ結果
     */
    async pushAndDeploy(options = {}) {
        try {
            const {
                watch = false,
                force = false,
                deployDescription = null,
                deploymentId = null
            } = options;

            this.logger.info('📤 ローカルファイルをプッシュ中...');

            // プッシュコマンド構築
            let pushCommand = 'clasp push';
            if (watch) pushCommand += ' --watch';
            if (force) pushCommand += ' --force';

            // プッシュ実行
            const pushResult = await this.executeCommand(pushCommand);
            
            if (!pushResult.success) {
                return pushResult;
            }

            this.logger.info('🚀 デプロイメント作成中...');

            // デプロイコマンド構築
            let deployCommand = 'clasp deploy';
            if (deployDescription) {
                deployCommand += ` --description "${deployDescription}"`;
            }
            if (deploymentId) {
                deployCommand += ` --deploymentId ${deploymentId}`;
            }

            // デプロイ実行
            const deployResult = await this.executeCommand(deployCommand);

            return {
                success: deployResult.success,
                push: {
                    output: pushResult.stdout,
                    success: true
                },
                deploy: {
                    output: deployResult.stdout,
                    success: deployResult.success,
                    error: deployResult.error
                },
                message: deployResult.success 
                    ? 'プッシュとデプロイが完了しました'
                    : 'プッシュは成功しましたが、デプロイに失敗しました'
            };

        } catch (error) {
            this.logger.error('❌ プッシュ・デプロイエラー:', error);
            return {
                success: false,
                error: error.message,
                action: 'push_deploy_failed'
            };
        }
    }

    /**
     * プロジェクト一覧を取得
     * @returns {Promise<Object>} プロジェクト一覧
     */
    async list() {
        try {
            this.logger.info('📋 プロジェクト一覧を取得中...');

            const result = await this.executeCommand('clasp list');

            if (result.success) {
                const projects = this.parseProjectList(result.stdout);
                
                return {
                    success: true,
                    projects,
                    count: projects.length,
                    output: result.stdout,
                    message: `${projects.length}個のプロジェクトが見つかりました`
                };
            }

            return result;

        } catch (error) {
            this.logger.error('❌ プロジェクト一覧取得エラー:', error);
            return {
                success: false,
                error: error.message,
                action: 'list_failed'
            };
        }
    }

    /**
     * ログイン状況をチェック
     * @returns {Promise<Object>} ログイン状況
     */
    async checkLoginStatus() {
        try {
            const result = await this.executeCommand('clasp auth --status');
            
            return {
                isLoggedIn: result.success,
                output: result.stdout,
                error: result.error
            };

        } catch (error) {
            return {
                isLoggedIn: false,
                error: error.message
            };
        }
    }

    /**
     * API有効化状況をチェック
     * @returns {Promise<Object>} API状況
     */
    async checkApiStatus() {
        try {
            const result = await this.executeCommand('clasp apis list');
            
            return {
                isEnabled: result.success,
                output: result.stdout,
                error: result.error
            };

        } catch (error) {
            return {
                isEnabled: false,
                error: error.message
            };
        }
    }

    /**
     * .clasp.json設定ファイルを読み取り
     * @returns {Promise<Object|null>} 設定内容
     */
    async readClaspConfig() {
        try {
            const configPath = path.join(this.workingDir, '.clasp.json');
            const configData = await fs.readFile(configPath, 'utf-8');
            return JSON.parse(configData);

        } catch (error) {
            this.logger.warn('⚠️ .clasp.json が見つかりません');
            return null;
        }
    }

    /**
     * プロジェクト一覧文字列をパース
     * @param {string} listOutput - clasp list の出力
     * @returns {Array<Object>} パースされたプロジェクト一覧
     */
    parseProjectList(listOutput) {
        const projects = [];
        const lines = listOutput.split('\n');

        for (const line of lines) {
            const match = line.match(/^(.+?)\s+─\s+(.+)$/);
            if (match) {
                const [, title, scriptId] = match;
                projects.push({
                    title: title.trim(),
                    scriptId: scriptId.trim()
                });
            }
        }

        return projects;
    }

    /**
     * コマンドを実行
     * @param {string} command - 実行するコマンド
     * @returns {Promise<Object>} 実行結果
     */
    async executeCommand(command) {
        try {
            this.logger.debug(`Executing: ${command}`);

            const options = {
                cwd: this.workingDir,
                timeout: this.timeout,
                encoding: 'utf8'
            };

            const { stdout, stderr } = await execAsync(command, options);

            return {
                success: true,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                command
            };

        } catch (error) {
            this.logger.error(`Command failed: ${command}`, error);
            return {
                success: false,
                error: error.message,
                stderr: error.stderr || '',
                stdout: error.stdout || '',
                command
            };
        }
    }

    /**
     * 環境設定を取得
     * @returns {Object} 環境設定
     */
    getConfig() {
        return {
            workingDir: this.workingDir,
            environment: this.environment,
            timeout: this.timeout
        };
    }

    /**
     * 環境設定を更新
     * @param {Object} config - 新しい設定
     */
    updateConfig(config) {
        if (config.workingDir) this.workingDir = config.workingDir;
        if (config.environment) this.environment = config.environment;
        if (config.timeout) this.timeout = config.timeout;
    }
}

export default ClaspService;
