/**
 * Google Apps Script Clasp 統合サービス
 *
 * claspコマンドラインツールとの統合機能を提供
 * プロジェクトのセットアップ、クローン、プッシュ、デプロイ等を管理
 *
 * Author: Utakata
 * Session: google-apps-script-mcp-20250630-002
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const logger = require('../utils/logger');

class ClaspService {
    constructor() {
        this.claspConfigDir = path.join(os.homedir(), '.clasp');
        this.defaultTimeout = 30000; // 30秒
        this.environments = ['development', 'staging', 'production'];
    }

    /**
     * 1. clasp環境のセットアップ
     * claspのインストールとGoogleアカウントログインを実行
     */
    async setupClasp(options = {}) {
        logger.info('🔧 clasp環境セットアップを開始');
        
        try {
            const results = {
                installation: null,
                login: null,
                version: null,
                status: 'success'
            };

            // claspがインストールされているかチェック
            const isInstalled = await this.checkClaspInstallation();
            
            if (!isInstalled && options.autoInstall !== false) {
                logger.info('📦 claspをグローバルインストール中...');
                results.installation = await this.installClasp();
            } else if (isInstalled) {
                results.installation = { status: 'already_installed' };
            }

            // バージョン確認
            results.version = await this.getClaspVersion();
            logger.info(`✅ clasp バージョン: ${results.version}`);

            // ログイン状態確認
            const loginStatus = await this.checkLoginStatus();
            
            if (!loginStatus.isLoggedIn && options.autoLogin !== false) {
                logger.info('🔐 Google Apps Scriptにログイン中...');
                results.login = await this.loginToClasp(options.loginOptions);
            } else if (loginStatus.isLoggedIn) {
                results.login = {
                    status: 'already_logged_in',
                    user: loginStatus.userInfo
                };
            }

            logger.info('✅ clasp環境セットアップ完了');
            return results;

        } catch (error) {
            logger.error('❌ clasp環境セットアップエラー:', error);
            throw new Error(`clasp setup failed: ${error.message}`);
        }
    }

    /**
     * 2. 新しいGoogle Apps Scriptプロジェクトを作成
     */
    async createProject(projectName, options = {}) {
        logger.info(`📁 新しいGASプロジェクト作成: ${projectName}`);
        
        try {
            // プロジェクトディレクトリ作成
            const projectDir = options.directory || path.join(process.cwd(), projectName);
            await fs.mkdir(projectDir, { recursive: true });

            // claspプロジェクト作成コマンド構築
            const createOptions = {
                type: options.type || 'standalone', // standalone, webapp, api, sheets, docs, slides, forms
                title: options.title || projectName,
                parentId: options.parentId || null, // Google Drive folder ID
                rootDir: projectDir
            };

            let claspCommand = ['clasp', 'create'];
            
            if (createOptions.title) {
                claspCommand.push('--title', `"${createOptions.title}"`);
            }
            
            if (createOptions.type) {
                claspCommand.push('--type', createOptions.type);
            }
            
            if (createOptions.parentId) {
                claspCommand.push('--parentId', createOptions.parentId);
            }

            // コマンド実行
            const result = await this.executeClaspCommand(claspCommand, projectDir);
            
            // .clasp.json の内容取得
            const claspConfigPath = path.join(projectDir, '.clasp.json');
            const claspConfig = await this.readClaspConfig(claspConfigPath);

            // 初期ファイル構造作成
            if (options.createInitialFiles !== false) {
                await this.createInitialProjectFiles(projectDir, createOptions.type);
            }

            logger.info(`✅ GASプロジェクト作成完了: ${claspConfig.scriptId}`);
            
            return {
                projectName,
                projectDir,
                scriptId: claspConfig.scriptId,
                type: createOptions.type,
                claspConfig,
                claspOutput: result.stdout,
                success: true
            };

        } catch (error) {
            logger.error('❌ GASプロジェクト作成エラー:', error);
            throw new Error(`Project creation failed: ${error.message}`);
        }
    }

    /**
     * 3. 既存のGoogle Apps Scriptプロジェクトをクローン
     */
    async cloneProject(scriptId, options = {}) {
        logger.info(`🔄 GASプロジェクトクローン: ${scriptId}`);
        
        try {
            // クローン先ディレクトリ決定
            const cloneDir = options.directory || path.join(process.cwd(), `gas-project-${scriptId}`);
            await fs.mkdir(cloneDir, { recursive: true });

            // claspクローンコマンド実行
            const claspCommand = ['clasp', 'clone', scriptId];
            const result = await this.executeClaspCommand(claspCommand, cloneDir);

            // .clasp.json 読み込み
            const claspConfigPath = path.join(cloneDir, '.clasp.json');
            const claspConfig = await this.readClaspConfig(claspConfigPath);

            // プロジェクト情報取得
            const projectInfo = await this.getProjectInfo(cloneDir);

            logger.info(`✅ GASプロジェクトクローン完了: ${claspConfig.scriptId}`);
            
            return {
                scriptId,
                cloneDir,
                claspConfig,
                projectInfo,
                claspOutput: result.stdout,
                success: true
            };

        } catch (error) {
            logger.error('❌ GASプロジェクトクローンエラー:', error);
            throw new Error(`Project clone failed: ${error.message}`);
        }
    }

    /**
     * 4. リモートの変更をローカルプロジェクトに取得
     * 環境に応じて.clasp.jsonを自動切替
     */
    async pullChanges(projectDir, options = {}) {
        logger.info('📥 リモート変更をローカルに取得中...');
        
        try {
            // 環境別設定切替
            if (options.environment) {
                await this.switchEnvironment(projectDir, options.environment);
            }

            // clasp pullコマンド実行
            const claspCommand = ['clasp', 'pull'];
            
            if (options.versionNumber) {
                claspCommand.push('--versionNumber', options.versionNumber.toString());
            }

            const result = await this.executeClaspCommand(claspCommand, projectDir);

            // 変更されたファイル一覧取得
            const changedFiles = this.parseClaspPullOutput(result.stdout);

            logger.info(`✅ リモート変更取得完了: ${changedFiles.length}ファイル更新`);
            
            return {
                projectDir,
                environment: options.environment,
                changedFiles,
                claspOutput: result.stdout,
                success: true
            };

        } catch (error) {
            logger.error('❌ リモート変更取得エラー:', error);
            throw new Error(`Pull changes failed: ${error.message}`);
        }
    }

    /**
     * 5. ローカルの変更をプッシュし、必要に応じてデプロイ
     * 環境に応じて.clasp.jsonを自動切替
     */
    async pushAndDeploy(projectDir, options = {}) {
        logger.info('📤 ローカル変更をプッシュ・デプロイ中...');
        
        try {
            const results = {
                push: null,
                deploy: null,
                environment: options.environment
            };

            // 環境別設定切替
            if (options.environment) {
                await this.switchEnvironment(projectDir, options.environment);
            }

            // clasp pushコマンド実行
            const pushCommand = ['clasp', 'push'];
            
            if (options.watch) {
                pushCommand.push('--watch');
            }
            
            if (options.force) {
                pushCommand.push('--force');
            }

            results.push = await this.executeClaspCommand(pushCommand, projectDir);
            logger.info('✅ プッシュ完了');

            // デプロイ実行（オプション）
            if (options.deploy !== false) {
                const deployOptions = {
                    description: options.deployDescription || `Deploy ${new Date().toISOString()}`,
                    versionNumber: options.versionNumber || null,
                    manifestFileName: options.manifestFileName || null
                };

                results.deploy = await this.deployProject(projectDir, deployOptions);
                logger.info('✅ デプロイ完了');
            }

            return {
                projectDir,
                environment: options.environment,
                pushOutput: results.push.stdout,
                deployOutput: results.deploy?.stdout,
                deployUrl: results.deploy?.deployUrl,
                success: true
            };

        } catch (error) {
            logger.error('❌ プッシュ・デプロイエラー:', error);
            throw new Error(`Push and deploy failed: ${error.message}`);
        }
    }

    /**
     * 6. アカウントに紐づくGoogle Apps Scriptプロジェクトの一覧を表示
     */
    async listProjects(options = {}) {
        logger.info('📋 GASプロジェクト一覧取得中...');
        
        try {
            // clasp listコマンド実行
            const claspCommand = ['clasp', 'list'];
            const result = await this.executeClaspCommand(claspCommand);

            // 出力をパース
            const projects = this.parseClaspListOutput(result.stdout);

            // 詳細情報取得（オプション）
            if (options.includeDetails) {
                for (const project of projects) {
                    try {
                        const details = await this.getProjectDetails(project.scriptId);
                        Object.assign(project, details);
                    } catch (error) {
                        logger.warn(`プロジェクト詳細取得失敗: ${project.scriptId}`, error);
                    }
                }
            }

            logger.info(`✅ GASプロジェクト一覧取得完了: ${projects.length}件`);
            
            return {
                projects,
                count: projects.length,
                claspOutput: result.stdout,
                success: true
            };

        } catch (error) {
            logger.error('❌ GASプロジェクト一覧取得エラー:', error);
            throw new Error(`List projects failed: ${error.message}`);
        }
    }

    // ========== 内部ヘルパーメソッド ==========

    /**
     * claspがインストールされているかチェック
     */
    async checkClaspInstallation() {
        try {
            await this.executeClaspCommand(['clasp', '--version']);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * claspをグローバルインストール
     */
    async installClasp() {
        return new Promise((resolve, reject) => {
            const installProcess = spawn('npm', ['install', '-g', '@google/clasp'], {
                stdio: 'pipe'
            });

            let stdout = '';
            let stderr = '';

            installProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            installProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            installProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ status: 'installed', output: stdout });
                } else {
                    reject(new Error(`Installation failed: ${stderr}`));
                }
            });
        });
    }

    /**
     * claspバージョン取得
     */
    async getClaspVersion() {
        try {
            const result = await this.executeClaspCommand(['clasp', '--version']);
            return result.stdout.trim();
        } catch (error) {
            throw new Error(`Failed to get clasp version: ${error.message}`);
        }
    }

    /**
     * ログイン状態確認
     */
    async checkLoginStatus() {
        try {
            const result = await this.executeClaspCommand(['clasp', 'login', '--status']);
            return {
                isLoggedIn: true,
                userInfo: result.stdout.trim()
            };
        } catch (error) {
            return {
                isLoggedIn: false,
                error: error.message
            };
        }
    }

    /**
     * Google Apps Scriptにログイン
     */
    async loginToClasp(options = {}) {
        return new Promise((resolve, reject) => {
            const loginCommand = ['clasp', 'login'];
            
            if (options.noLocalhost) {
                loginCommand.push('--no-localhost');
            }
            
            if (options.creds) {
                loginCommand.push('--creds', options.creds);
            }

            const loginProcess = spawn(loginCommand[0], loginCommand.slice(1), {
                stdio: 'inherit' // ユーザー入力が必要なため
            });

            loginProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ status: 'logged_in', code });
                } else {
                    reject(new Error(`Login failed with code: ${code}`));
                }
            });
        });
    }

    /**
     * 環境別.clasp.json切替
     */
    async switchEnvironment(projectDir, environment) {
        if (!this.environments.includes(environment)) {
            throw new Error(`Invalid environment: ${environment}. Valid options: ${this.environments.join(', ')}`);
        }

        const envConfigFile = path.join(projectDir, `.clasp.${environment}.json`);
        const defaultConfigFile = path.join(projectDir, '.clasp.json');

        try {
            // 環境別設定ファイルが存在するかチェック
            await fs.access(envConfigFile);
            
            // 現在の.clasp.jsonをバックアップ
            const backupFile = path.join(projectDir, '.clasp.backup.json');
            try {
                await fs.copyFile(defaultConfigFile, backupFile);
            } catch (error) {
                // バックアップファイルが作成できなくても処理続行
            }

            // 環境別設定をコピー
            await fs.copyFile(envConfigFile, defaultConfigFile);
            
            logger.info(`✅ 環境切替完了: ${environment}`);
            
        } catch (error) {
            logger.warn(`環境別設定ファイルが見つかりません: ${envConfigFile}`);
            throw new Error(`Environment config not found: ${environment}`);
        }
    }

    /**
     * プロジェクトデプロイ
     */
    async deployProject(projectDir, options = {}) {
        const deployCommand = ['clasp', 'deploy'];
        
        if (options.description) {
            deployCommand.push('--description', `"${options.description}"`);
        }
        
        if (options.versionNumber) {
            deployCommand.push('--versionNumber', options.versionNumber.toString());
        }

        const result = await this.executeClaspCommand(deployCommand, projectDir);
        
        // デプロイURLを抽出
        const deployUrl = this.extractDeployUrl(result.stdout);
        
        return {
            ...result,
            deployUrl
        };
    }

    /**
     * .clasp.json読み込み
     */
    async readClaspConfig(configPath) {
        try {
            const configContent = await fs.readFile(configPath, 'utf8');
            return JSON.parse(configContent);
        } catch (error) {
            throw new Error(`Failed to read .clasp.json: ${error.message}`);
        }
    }

    /**
     * 初期プロジェクトファイル作成
     */
    async createInitialProjectFiles(projectDir, projectType) {
        const templates = {
            'standalone': this.getStandaloneTemplate(),
            'webapp': this.getWebAppTemplate(),
            'api': this.getApiTemplate()
        };

        const template = templates[projectType] || templates['standalone'];
        
        for (const [fileName, content] of Object.entries(template)) {
            const filePath = path.join(projectDir, fileName);
            await fs.writeFile(filePath, content, 'utf8');
        }
    }

    /**
     * claspコマンド実行
     */
    async executeClaspCommand(command, workingDir = process.cwd()) {
        return new Promise((resolve, reject) => {
            const commandStr = Array.isArray(command) ? command.join(' ') : command;
            
            exec(commandStr, {
                cwd: workingDir,
                timeout: this.defaultTimeout
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Command failed: ${commandStr}\nError: ${error.message}\nStderr: ${stderr}`));
                } else {
                    resolve({ stdout, stderr, command: commandStr });
                }
            });
        });
    }

    /**
     * clasp pullの出力をパース
     */
    parseClaspPullOutput(output) {
        const lines = output.split('\n');
        const changedFiles = [];
        
        for (const line of lines) {
            if (line.includes('└─') || line.includes('├─')) {
                const fileName = line.split('─').pop().trim();
                if (fileName && fileName !== '') {
                    changedFiles.push(fileName);
                }
            }
        }
        
        return changedFiles;
    }

    /**
     * clasp listの出力をパース
     */
    parseClaspListOutput(output) {
        const lines = output.split('\n');
        const projects = [];
        
        for (const line of lines) {
            if (line.includes('- ')) {
                const parts = line.split('- ');
                if (parts.length >= 2) {
                    const projectInfo = parts[1].trim();
                    const match = projectInfo.match(/^(.+?)\s*–\s*(.+)$/);
                    
                    if (match) {
                        projects.push({
                            name: match[1].trim(),
                            scriptId: match[2].trim()
                        });
                    }
                }
            }
        }
        
        return projects;
    }

    /**
     * デプロイURL抽出
     */
    extractDeployUrl(output) {
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes('https://script.google.com/macros/s/')) {
                return line.trim();
            }
        }
        return null;
    }

    /**
     * プロジェクト情報取得
     */
    async getProjectInfo(projectDir) {
        try {
            const result = await this.executeClaspCommand(['clasp', 'status'], projectDir);
            return this.parseProjectStatus(result.stdout);
        } catch (error) {
            logger.warn('プロジェクト情報取得に失敗:', error);
            return null;
        }
    }

    /**
     * プロジェクト詳細取得
     */
    async getProjectDetails(scriptId) {
        // この機能は必要に応じてGoogle Apps Script APIを使用して実装
        return {
            scriptId,
            // 追加の詳細情報を取得
        };
    }

    /**
     * プロジェクトステータスパース
     */
    parseProjectStatus(output) {
        const status = {};
        const lines = output.split('\n');
        
        for (const line of lines) {
            if (line.includes(':')) {
                const [key, value] = line.split(':').map(s => s.trim());
                status[key.toLowerCase().replace(/\s+/g, '_')] = value;
            }
        }
        
        return status;
    }

    // ========== テンプレート生成 ==========

    getStandaloneTemplate() {
        return {
            'Code.js': `/**
 * Google Apps Script プロジェクト
 * 
 * Created with clasp
 */

function myFunction() {
  console.log('Hello, Google Apps Script!');
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('カスタムメニュー')
    .addItem('実行', 'myFunction')
    .addToUi();
}`,
            'appsscript.json': JSON.stringify({
                "timeZone": "Asia/Tokyo",
                "dependencies": {
                    "enabledAdvancedServices": []
                },
                "exceptionLogging": "STACKDRIVER",
                "runtimeVersion": "V8"
            }, null, 2)
        };
    }

    getWebAppTemplate() {
        return {
            'Code.js': `/**
 * Google Apps Script Web App
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('My Web App')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  return ContentService
    .createTextOutput(JSON.stringify({status: 'success', data: data}))
    .setMimeType(ContentService.MimeType.JSON);
}`,
            'index.html': `<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <title>My Web App</title>
  </head>
  <body>
    <h1>Google Apps Script Web App</h1>
    <p>This is a simple web app created with clasp.</p>
  </body>
</html>`,
            'appsscript.json': JSON.stringify({
                "timeZone": "Asia/Tokyo",
                "dependencies": {
                    "enabledAdvancedServices": []
                },
                "webapp": {
                    "access": "ANYONE_ANONYMOUS",
                    "executeAs": "USER_DEPLOYING"
                },
                "exceptionLogging": "STACKDRIVER",
                "runtimeVersion": "V8"
            }, null, 2)
        };
    }

    getApiTemplate() {
        return {
            'Code.js': `/**
 * Google Apps Script API
 */

function doGet(e) {
  const action = e.parameter.action;
  
  switch(action) {
    case 'getData':
      return getData(e.parameter);
    case 'postData':
      return postData(e.parameter);
    default:
      return ContentService
        .createTextOutput(JSON.stringify({error: 'Invalid action'}))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

function getData(params) {
  const data = {
    timestamp: new Date().toISOString(),
    params: params
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function postData(params) {
  // データ処理ロジック
  return ContentService
    .createTextOutput(JSON.stringify({status: 'success'}))
    .setMimeType(ContentService.MimeType.JSON);
}`,
            'appsscript.json': JSON.stringify({
                "timeZone": "Asia/Tokyo",
                "dependencies": {
                    "enabledAdvancedServices": []
                },
                "webapp": {
                    "access": "ANYONE",
                    "executeAs": "USER_DEPLOYING"
                },
                "exceptionLogging": "STACKDRIVER",
                "runtimeVersion": "V8"
            }, null, 2)
        };
    }
}

module.exports = ClaspService;