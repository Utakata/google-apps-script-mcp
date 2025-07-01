#!/usr/bin/env node

/**
 * Google Apps Script MCP Server (Clasp統合版)
 * 
 * 完全なGoogle Apps Script操作を提供するMCPサーバー
 * - プロジェクト管理（作成・更新・削除・一覧）
 * - スクリプトファイル操作（読み書き・実行）
 * - デプロイ管理（Webアプリ・アドオン・ライブラリ）
 * - トリガー管理（時間・イベント・フォーム連動）
 * - 実行ログ・エラー監視
 * - Clasp統合（セットアップ・クローン・プッシュ・デプロイ）
 * 
 * Author: Utakata
 * Session: google-apps-script-mcp-20250630-002
 * License: MIT
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { GoogleAuth } from './auth/google-auth.js';
import { GASApiService } from './services/gas-api.js';
import { ClaspService } from './services/clasp-service-es6.js';
import { chalk } from './utils/logger.js';
import { validateEnvironment } from './utils/validation.js';

class GoogleAppsScriptMCPServer {
  constructor() {
    this.name = 'google-apps-script-mcp';
    this.version = '1.1.0'; // clasp統合でバージョンアップ
    this.server = new Server(
      {
        name: this.name,
        version: this.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.googleAuth = new GoogleAuth();
    this.gasApi = new GASApiService();
    this.claspService = new ClaspService(); // clasp統合サービス追加
    this.setupToolHandlers();
  }

  /**
   * MCPツールハンドラーの設定
   */
  setupToolHandlers() {
    // ツール一覧の提供
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // === Clasp統合機能 ===
          {
            name: 'clasp_setup',
            description: 'clasp環境のセットアップ（claspのインストール、ログイン）を行います',
            inputSchema: {
              type: 'object',
              properties: {
                autoInstall: {
                  type: 'boolean',
                  description: '自動インストールするかどうか',
                  default: true
                },
                autoLogin: {
                  type: 'boolean',
                  description: '自動ログインするかどうか',
                  default: true
                },
                loginOptions: {
                  type: 'object',
                  properties: {
                    noLocalhost: {
                      type: 'boolean',
                      description: 'ローカルホストを使用しないかどうか'
                    },
                    creds: {
                      type: 'string',
                      description: '認証情報ファイルのパス'
                    }
                  }
                }
              }
            }
          },
          {
            name: 'clasp_create',
            description: '新しいGoogle Apps Scriptプロジェクトを作成します',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: {
                  type: 'string',
                  description: 'プロジェクト名'
                },
                type: {
                  type: 'string',
                  enum: ['standalone', 'webapp', 'api', 'sheets', 'docs', 'slides', 'forms'],
                  description: 'プロジェクトタイプ',
                  default: 'standalone'
                },
                title: {
                  type: 'string',
                  description: 'プロジェクトタイトル'
                },
                directory: {
                  type: 'string',
                  description: 'プロジェクトディレクトリ'
                },
                parentId: {
                  type: 'string',
                  description: 'Google Driveの親フォルダID'
                },
                createInitialFiles: {
                  type: 'boolean',
                  description: '初期ファイルを作成するかどうか',
                  default: true
                }
              },
              required: ['projectName']
            }
          },
          {
            name: 'clasp_clone',
            description: '既存のGoogle Apps Scriptプロジェクトをクローンします',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                directory: {
                  type: 'string',
                  description: 'クローン先ディレクトリ'
                }
              },
              required: ['scriptId']
            }
          },
          {
            name: 'clasp_pull',
            description: 'リモートの変更をローカルプロジェクトに取得します（環境切替対応）',
            inputSchema: {
              type: 'object',
              properties: {
                projectDir: {
                  type: 'string',
                  description: 'プロジェクトディレクトリ'
                },
                environment: {
                  type: 'string',
                  enum: ['development', 'staging', 'production'],
                  description: '対象環境'
                },
                versionNumber: {
                  type: 'number',
                  description: '取得するバージョン番号'
                }
              },
              required: ['projectDir']
            }
          },
          {
            name: 'clasp_push_and_deploy',
            description: 'ローカルの変更をプッシュし、必要に応じてデプロイします（環境切替対応）',
            inputSchema: {
              type: 'object',
              properties: {
                projectDir: {
                  type: 'string',
                  description: 'プロジェクトディレクトリ'
                },
                environment: {
                  type: 'string',
                  enum: ['development', 'staging', 'production'],
                  description: '対象環境'
                },
                deploy: {
                  type: 'boolean',
                  description: 'デプロイも実行するかどうか',
                  default: true
                },
                force: {
                  type: 'boolean',
                  description: '強制プッシュするかどうか',
                  default: false
                },
                watch: {
                  type: 'boolean',
                  description: 'ウォッチモードで実行するかどうか',
                  default: false
                },
                deployDescription: {
                  type: 'string',
                  description: 'デプロイの説明'
                },
                versionNumber: {
                  type: 'number',
                  description: 'デプロイするバージョン番号'
                }
              },
              required: ['projectDir']
            }
          },
          {
            name: 'clasp_list',
            description: 'アカウントに紐づくGoogle Apps Scriptプロジェクトの一覧を表示します',
            inputSchema: {
              type: 'object',
              properties: {
                includeDetails: {
                  type: 'boolean',
                  description: '詳細情報も取得するかどうか',
                  default: false
                }
              }
            }
          },

          // === プロジェクト管理 ===
          {
            name: 'create_gas_project',
            description: '新しいGoogle Apps Scriptプロジェクトを作成します',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'プロジェクトのタイトル'
                },
                parentId: {
                  type: 'string',
                  description: 'Google Driveの親フォルダID（省略可）'
                }
              },
              required: ['title']
            }
          },
          {
            name: 'list_gas_projects',
            description: 'Google Apps Scriptプロジェクトの一覧を取得します',
            inputSchema: {
              type: 'object',
              properties: {
                pageSize: {
                  type: 'number',
                  description: '取得件数（デフォルト: 10）',
                  default: 10
                },
                pageToken: {
                  type: 'string',
                  description: 'ページネーション用トークン'
                }
              }
            }
          },
          {
            name: 'get_gas_project',
            description: 'Google Apps Scriptプロジェクトの詳細を取得します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                versionNumber: {
                  type: 'number',
                  description: 'バージョン番号（省略時は最新）'
                }
              },
              required: ['scriptId']
            }
          },
          {
            name: 'update_gas_project',
            description: 'Google Apps Scriptプロジェクトを更新します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                content: {
                  type: 'object',
                  description: 'プロジェクトの内容'
                }
              },
              required: ['scriptId', 'content']
            }
          },

          // === ファイル操作 ===
          {
            name: 'create_gas_file',
            description: 'Google Apps Scriptファイルを作成します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                name: {
                  type: 'string',
                  description: 'ファイル名'
                },
                type: {
                  type: 'string',
                  enum: ['SERVER_JS', 'HTML'],
                  description: 'ファイルタイプ'
                },
                source: {
                  type: 'string',
                  description: 'ソースコード'
                }
              },
              required: ['scriptId', 'name', 'type', 'source']
            }
          },
          {
            name: 'get_gas_file',
            description: 'Google Apps Scriptファイルの内容を取得します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                fileName: {
                  type: 'string',
                  description: 'ファイル名'
                }
              },
              required: ['scriptId', 'fileName']
            }
          },
          {
            name: 'update_gas_file',
            description: 'Google Apps Scriptファイルを更新します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                fileName: {
                  type: 'string',
                  description: 'ファイル名'
                },
                source: {
                  type: 'string',
                  description: '新しいソースコード'
                }
              },
              required: ['scriptId', 'fileName', 'source']
            }
          },

          // === 実行・デプロイ ===
          {
            name: 'execute_gas_function',
            description: 'Google Apps Script関数を実行します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                function: {
                  type: 'string',
                  description: '実行する関数名'
                },
                parameters: {
                  type: 'array',
                  description: '関数の引数',
                  items: {
                    type: 'any'
                  }
                },
                devMode: {
                  type: 'boolean',
                  description: '開発モードで実行するか',
                  default: false
                }
              },
              required: ['scriptId', 'function']
            }
          },
          {
            name: 'deploy_gas_webapp',
            description: 'Google Apps ScriptをWebアプリとしてデプロイします',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                versionNumber: {
                  type: 'number',
                  description: 'デプロイするバージョン番号'
                },
                manifestFileName: {
                  type: 'string',
                  description: 'マニフェストファイル名',
                  default: 'appsscript'
                },
                description: {
                  type: 'string',
                  description: 'デプロイメントの説明'
                }
              },
              required: ['scriptId']
            }
          },

          // === トリガー管理 ===
          {
            name: 'manage_gas_triggers',
            description: 'Google Apps Scriptのトリガーを管理します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                action: {
                  type: 'string',
                  enum: ['list', 'create', 'delete'],
                  description: '実行するアクション'
                },
                triggerConfig: {
                  type: 'object',
                  description: 'トリガー設定（createの場合）',
                  properties: {
                    handlerFunction: {
                      type: 'string',
                      description: '実行する関数名'
                    },
                    eventType: {
                      type: 'string',
                      enum: ['CLOCK', 'ON_OPEN', 'ON_EDIT', 'ON_FORM_SUBMIT'],
                      description: 'イベントタイプ'
                    }
                  }
                },
                triggerId: {
                  type: 'string',
                  description: 'トリガーID（deleteの場合）'
                }
              },
              required: ['scriptId', 'action']
            }
          },

          // === ログ・監視 ===
          {
            name: 'get_gas_logs',
            description: 'Google Apps Scriptの実行ログを取得します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                pageSize: {
                  type: 'number',
                  description: '取得件数',
                  default: 100
                },
                pageToken: {
                  type: 'string',
                  description: 'ページネーション用トークン'
                },
                filter: {
                  type: 'string',
                  description: 'フィルター条件'
                }
              },
              required: ['scriptId']
            }
          },

          // === ライブラリ管理 ===
          {
            name: 'manage_gas_libraries',
            description: 'Google Apps Scriptのライブラリを管理します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                action: {
                  type: 'string',
                  enum: ['list', 'add', 'remove', 'update'],
                  description: '実行するアクション'
                },
                libraryId: {
                  type: 'string',
                  description: 'ライブラリID（add/remove/updateの場合）'
                },
                version: {
                  type: 'string',
                  description: 'ライブラリバージョン'
                },
                identifier: {
                  type: 'string',
                  description: 'ライブラリ識別子'
                }
              },
              required: ['scriptId', 'action']
            }
          }
        ]
      };
    });

    // ツール実行ハンドラー
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Clasp機能の場合は認証不要、API機能の場合は認証確認
        if (!name.startsWith('clasp_')) {
          await this.ensureAuthenticated();
        }

        // ツール実行
        switch (name) {
          // === Clasp統合機能 ===
          case 'clasp_setup':
            return await this.claspSetup(args);
          case 'clasp_create':
            return await this.claspCreate(args);
          case 'clasp_clone':
            return await this.claspClone(args);
          case 'clasp_pull':
            return await this.claspPull(args);
          case 'clasp_push_and_deploy':
            return await this.claspPushAndDeploy(args);
          case 'clasp_list':
            return await this.claspList(args);

          // === 既存のAPI機能 ===
          case 'create_gas_project':
            return await this.createGasProject(args);
          case 'list_gas_projects':
            return await this.listGasProjects(args);
          case 'get_gas_project':
            return await this.getGasProject(args);
          case 'update_gas_project':
            return await this.updateGasProject(args);
          case 'create_gas_file':
            return await this.createGasFile(args);
          case 'get_gas_file':
            return await this.getGasFile(args);
          case 'update_gas_file':
            return await this.updateGasFile(args);
          case 'execute_gas_function':
            return await this.executeGasFunction(args);
          case 'deploy_gas_webapp':
            return await this.deployGasWebApp(args);
          case 'manage_gas_triggers':
            return await this.manageGasTriggers(args);
          case 'get_gas_logs':
            return await this.getGasLogs(args);
          case 'manage_gas_libraries':
            return await this.manageGasLibraries(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  /**
   * 認証確認
   */
  async ensureAuthenticated() {
    if (!this.googleAuth.isAuthenticated()) {
      await this.googleAuth.authenticate();
    }
  }

  // ===== Clasp統合ツール実装メソッド =====

  async claspSetup(args) {
    try {
      const result = await this.claspService.setupClasp(args);
      
      let text = `🔧 clasp環境セットアップ完了\n\n`;
      
      // インストール結果
      if (result.installation) {
        if (result.installation.status === 'already_installed') {
          text += `📦 clasp: すでにインストール済み\n`;
        } else if (result.installation.status === 'installed') {
          text += `📦 clasp: グローバルインストール完了\n`;
        }
      }
      
      // バージョン情報
      if (result.version) {
        text += `🏷️ バージョン: ${result.version}\n`;
      }
      
      // ログイン結果
      if (result.login) {
        if (result.login.status === 'already_logged_in') {
          text += `🔐 ログイン: すでにログイン済み\n`;
          if (result.login.user) {
            text += `👤 ユーザー: ${result.login.user}\n`;
          }
        } else if (result.login.status === 'logged_in') {
          text += `🔐 ログイン: 完了\n`;
        }
      }
      
      text += `\n✅ clasp準備完了！これでGoogle Apps Scriptプロジェクトの管理ができます。`;

      return {
        content: [
          {
            type: 'text',
            text: text
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ clasp環境セットアップエラー: ${error.message}`
          }
        ]
      };
    }
  }

  async claspCreate(args) {
    try {
      const result = await this.claspService.createProject(args.projectName, args);
      
      let text = `📁 GASプロジェクト作成完了\n\n`;
      text += `🎯 プロジェクト名: ${result.projectName}\n`;
      text += `🆔 スクリプトID: ${result.scriptId}\n`;
      text += `📂 タイプ: ${result.type}\n`;
      text += `📁 ディレクトリ: ${result.projectDir}\n`;
      text += `🔗 編集URL: https://script.google.com/d/${result.scriptId}/edit\n\n`;
      
      if (args.createInitialFiles !== false) {
        text += `✨ 初期ファイル構造を作成しました\n`;
        text += `- Code.js (メインスクリプト)\n`;
        text += `- appsscript.json (マニフェスト)\n`;
        if (result.type === 'webapp') {
          text += `- index.html (Webアプリ用HTML)\n`;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: text
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ GASプロジェクト作成エラー: ${error.message}`
          }
        ]
      };
    }
  }

  async claspClone(args) {
    try {
      const result = await this.claspService.cloneProject(args.scriptId, args);
      
      let text = `🔄 GASプロジェクトクローン完了\n\n`;
      text += `🆔 スクリプトID: ${result.scriptId}\n`;
      text += `📁 クローン先: ${result.cloneDir}\n`;
      
      if (result.projectInfo) {
        text += `\n📊 プロジェクト情報:\n`;
        for (const [key, value] of Object.entries(result.projectInfo)) {
          text += `  ${key}: ${value}\n`;
        }
      }
      
      text += `\n✅ ローカル開発環境の準備完了！`;

      return {
        content: [
          {
            type: 'text',
            text: text
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ GASプロジェクトクローンエラー: ${error.message}`
          }
        ]
      };
    }
  }

  async claspPull(args) {
    try {
      const result = await this.claspService.pullChanges(args.projectDir, args);
      
      let text = `📥 リモート変更取得完了\n\n`;
      text += `📁 プロジェクト: ${result.projectDir}\n`;
      
      if (result.environment) {
        text += `🔄 環境: ${result.environment}\n`;
      }
      
      text += `📄 更新ファイル数: ${result.changedFiles.length}\n`;
      
      if (result.changedFiles.length > 0) {
        text += `\n📂 更新されたファイル:\n`;
        result.changedFiles.forEach(file => {
          text += `  - ${file}\n`;
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: text
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ リモート変更取得エラー: ${error.message}`
          }
        ]
      };
    }
  }

  async claspPushAndDeploy(args) {
    try {
      const result = await this.claspService.pushAndDeploy(args.projectDir, args);
      
      let text = `📤 プッシュ・デプロイ完了\n\n`;
      text += `📁 プロジェクト: ${result.projectDir}\n`;
      
      if (result.environment) {
        text += `🔄 環境: ${result.environment}\n`;
      }
      
      text += `✅ プッシュ: 完了\n`;
      
      if (result.deployOutput) {
        text += `🚀 デプロイ: 完了\n`;
        if (result.deployUrl) {
          text += `🌐 デプロイURL: ${result.deployUrl}\n`;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: text
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ プッシュ・デプロイエラー: ${error.message}`
          }
        ]
      };
    }
  }

  async claspList(args) {
    try {
      const result = await this.claspService.listProjects(args);
      
      let text = `📋 GASプロジェクト一覧 (${result.count}件)\n\n`;
      
      if (result.projects.length > 0) {
        result.projects.forEach((project, index) => {
          text += `${index + 1}. **${project.name}**\n`;
          text += `   🆔 ID: ${project.scriptId}\n`;
          text += `   🔗 URL: https://script.google.com/d/${project.scriptId}/edit\n\n`;
        });
      } else {
        text += `プロジェクトが見つかりませんでした。\n`;
        text += `新しいプロジェクトを作成するには \`clasp_create\` ツールを使用してください。`;
      }

      return {
        content: [
          {
            type: 'text',
            text: text
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ GASプロジェクト一覧取得エラー: ${error.message}`
          }
        ]
      };
    }
  }

  // ===== 既存のツール実装メソッド =====
  // (元のindex.jsから引き継ぎ)

  async createGasProject(args) {
    const result = await this.gasApi.createProject(args.title, args.parentId);
    return {
      content: [
        {
          type: 'text',
          text: `✅ Google Apps Scriptプロジェクト「${args.title}」を作成しました\n\n` +
                `🆔 プロジェクトID: ${result.scriptId}\n` +
                `📁 Drive URL: https://script.google.com/d/${result.scriptId}/edit`
        }
      ]
    };
  }

  async listGasProjects(args) {
    const result = await this.gasApi.listProjects(args.pageSize, args.pageToken);
    const projects = result.files || [];
    
    let text = `📋 Google Apps Scriptプロジェクト一覧 (${projects.length}件)\n\n`;
    
    projects.forEach((project, index) => {
      text += `${index + 1}. **${project.title}**\n`;
      text += `   🆔 ID: ${project.scriptId}\n`;
      text += `   📅 更新日: ${project.updateTime}\n`;
      text += `   🔗 URL: https://script.google.com/d/${project.scriptId}/edit\n\n`;
    });

    return {
      content: [
        {
          type: 'text',
          text: text
        }
      ]
    };
  }

  async getGasProject(args) {
    const result = await this.gasApi.getProject(args.scriptId, args.versionNumber);
    
    let text = `📄 プロジェクト詳細: ${result.title}\n\n`;
    text += `🆔 ID: ${result.scriptId}\n`;
    text += `📅 作成日: ${result.createTime}\n`;
    text += `📅 更新日: ${result.updateTime}\n\n`;
    
    if (result.files) {
      text += `📂 ファイル一覧:\n`;
      result.files.forEach(file => {
        text += `  - ${file.name} (${file.type})\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: text
        }
      ]
    };
  }

  async updateGasProject(args) {
    const result = await this.gasApi.updateProject(args.scriptId, args.content);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ プロジェクト「${result.title}」を更新しました\n\n` +
                `📅 更新日時: ${result.updateTime}`
        }
      ]
    };
  }

  async createGasFile(args) {
    const result = await this.gasApi.createFile(
      args.scriptId, 
      args.name, 
      args.type, 
      args.source
    );
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ ファイル「${args.name}」を作成しました\n\n` +
                `📄 タイプ: ${args.type}\n` +
                `📏 サイズ: ${args.source.length} 文字`
        }
      ]
    };
  }

  async getGasFile(args) {
    const result = await this.gasApi.getFile(args.scriptId, args.fileName);
    
    return {
      content: [
        {
          type: 'text',
          text: `📄 ファイル: ${args.fileName}\n\n` +
                `タイプ: ${result.type}\n\n` +
                `\`\`\`javascript\n${result.source}\n\`\`\``
        }
      ]
    };
  }

  async updateGasFile(args) {
    const result = await this.gasApi.updateFile(
      args.scriptId, 
      args.fileName, 
      args.source
    );
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ ファイル「${args.fileName}」を更新しました\n\n` +
                `📏 新サイズ: ${args.source.length} 文字`
        }
      ]
    };
  }

  async executeGasFunction(args) {
    const result = await this.gasApi.executeFunction(
      args.scriptId,
      args.function,
      args.parameters || [],
      args.devMode
    );
    
    let text = `🚀 関数実行: ${args.function}\n\n`;
    
    if (result.error) {
      text += `❌ エラーが発生しました:\n${JSON.stringify(result.error, null, 2)}`;
    } else {
      text += `✅ 実行成功\n`;
      if (result.response && result.response.result !== undefined) {
        text += `📊 戻り値:\n\`\`\`json\n${JSON.stringify(result.response.result, null, 2)}\n\`\`\``;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: text
        }
      ]
    };
  }

  async deployGasWebApp(args) {
    const result = await this.gasApi.deployWebApp(
      args.scriptId,
      args.versionNumber,
      args.manifestFileName,
      args.description
    );
    
    return {
      content: [
        {
          type: 'text',
          text: `🚀 Webアプリをデプロイしました\n\n` +
                `🆔 デプロイID: ${result.deploymentId}\n` +
                `🌐 URL: ${result.entryPoints?.[0]?.webApp?.url || 'N/A'}\n` +
                `📝 説明: ${args.description || 'なし'}`
        }
      ]
    };
  }

  async manageGasTriggers(args) {
    const result = await this.gasApi.manageTriggers(
      args.scriptId,
      args.action,
      args.triggerConfig,
      args.triggerId
    );
    
    let text = `⚡ トリガー管理: ${args.action}\n\n`;
    
    switch (args.action) {
      case 'list':
        if (result.triggers && result.triggers.length > 0) {
          result.triggers.forEach((trigger, index) => {
            text += `${index + 1}. ${trigger.handlerFunction}\n`;
            text += `   タイプ: ${trigger.eventType}\n`;
            text += `   ID: ${trigger.triggerId}\n\n`;
          });
        } else {
          text += '設定されているトリガーはありません。';
        }
        break;
      case 'create':
        text += `✅ トリガーを作成しました\n`;
        text += `🆔 ID: ${result.triggerId}\n`;
        text += `⚙️ 関数: ${args.triggerConfig.handlerFunction}`;
        break;
      case 'delete':
        text += `✅ トリガーを削除しました\n🆔 ID: ${args.triggerId}`;
        break;
    }

    return {
      content: [
        {
          type: 'text',
          text: text
        }
      ]
    };
  }

  async getGasLogs(args) {
    const result = await this.gasApi.getLogs(
      args.scriptId,
      args.pageSize,
      args.pageToken,
      args.filter
    );
    
    let text = `📊 実行ログ\n\n`;
    
    if (result.executions && result.executions.length > 0) {
      result.executions.forEach((execution, index) => {
        text += `${index + 1}. **${execution.function}**\n`;
        text += `   📅 実行日時: ${execution.createTime}\n`;
        text += `   ⏱️ 実行時間: ${execution.duration}\n`;
        text += `   📊 ステータス: ${execution.status}\n`;
        if (execution.error) {
          text += `   ❌ エラー: ${execution.error.message}\n`;
        }
        text += '\n';
      });
    } else {
      text += 'ログがありません。';
    }

    return {
      content: [
        {
          type: 'text',
          text: text
        }
      ]
    };
  }

  async manageGasLibraries(args) {
    const result = await this.gasApi.manageLibraries(
      args.scriptId,
      args.action,
      args.libraryId,
      args.version,
      args.identifier
    );
    
    let text = `📚 ライブラリ管理: ${args.action}\n\n`;
    
    switch (args.action) {
      case 'list':
        if (result.libraries && result.libraries.length > 0) {
          result.libraries.forEach((library, index) => {
            text += `${index + 1}. **${library.userSymbol}**\n`;
            text += `   🆔 ID: ${library.libraryId}\n`;
            text += `   📊 バージョン: ${library.version}\n\n`;
          });
        } else {
          text += 'ライブラリは設定されていません。';
        }
        break;
      case 'add':
        text += `✅ ライブラリを追加しました\n`;
        text += `🆔 ID: ${args.libraryId}\n`;
        text += `📊 バージョン: ${args.version}`;
        break;
      case 'remove':
        text += `✅ ライブラリを削除しました\n🆔 ID: ${args.libraryId}`;
        break;
      case 'update':
        text += `✅ ライブラリを更新しました\n`;
        text += `🆔 ID: ${args.libraryId}\n`;
        text += `📊 新バージョン: ${args.version}`;
        break;
    }

    return {
      content: [
        {
          type: 'text',
          text: text
        }
      ]
    };
  }

  /**
   * サーバー開始
   */
  async run() {
    // 環境変数検証
    validateEnvironment();
    
    console.log(chalk.blue(`🚀 Google Apps Script MCP Server v${this.version} 起動中...`));
    console.log(chalk.green('🔧 Clasp統合機能が利用可能です'));
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log(chalk.green('✅ サーバーが正常に起動しました'));
  }
}

// メイン実行
async function main() {
  const server = new GoogleAppsScriptMCPServer();
  await server.run();
}

// エラーハンドリング
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🛑 サーバーを停止しています...'));
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { GoogleAppsScriptMCPServer };