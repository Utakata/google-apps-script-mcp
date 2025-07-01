#!/usr/bin/env node

/**
 * Google Apps Script MCP Server with Security
 * 
 * 完全なGoogle Apps Script操作とセキュリティ機能を提供するMCPサーバー
 * - プロジェクト管理（作成・更新・削除・一覧）
 * - スクリプトファイル操作（読み書き・実行）
 * - デプロイ管理（Webアプリ・アドオン・ライブラリ）
 * - トリガー管理（時間・イベント・フォーム連動）
 * - 実行ログ・エラー監視
 * - 🔒 セキュアなスクリプトプロパティ管理（暗号化対応）
 * - 🛡️ セキュリティ監査・バックアップ・復元
 * 
 * Author: Utakata
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
import { PropertiesManager } from './services/security.js';
import { chalk } from './utils/logger.js';
import { validateEnvironment } from './utils/validation.js';

class GoogleAppsScriptMCPServer {
  constructor() {
    this.name = 'google-apps-script-mcp';
    this.version = '1.0.0';
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
    this.propertiesManager = new PropertiesManager(this.gasApi);
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

          // === 🔒 セキュアなスクリプトプロパティ管理 ===
          {
            name: 'set_secure_property',
            description: '🔒 スクリプトプロパティに暗号化してデータを安全に保存します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                key: {
                  type: 'string',
                  description: 'プロパティキー'
                },
                value: {
                  type: 'string',
                  description: '保存する値'
                },
                encrypt: {
                  type: 'boolean',
                  description: '暗号化するか（デフォルト: true）',
                  default: true
                }
              },
              required: ['scriptId', 'key', 'value']
            }
          },
          {
            name: 'get_secure_property',
            description: '🔓 スクリプトプロパティから暗号化されたデータを安全に取得します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                key: {
                  type: 'string',
                  description: 'プロパティキー'
                },
                decrypt: {
                  type: 'boolean',
                  description: '復号化するか（デフォルト: true）',
                  default: true
                }
              },
              required: ['scriptId', 'key']
            }
          },
          {
            name: 'delete_property',
            description: '🗑️ スクリプトプロパティを削除します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                key: {
                  type: 'string',
                  description: '削除するプロパティキー'
                }
              },
              required: ['scriptId', 'key']
            }
          },
          {
            name: 'list_properties',
            description: '📋 すべてのスクリプトプロパティを一覧表示します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                decrypt: {
                  type: 'boolean',
                  description: '暗号化されたプロパティを復号化するか（デフォルト: true）',
                  default: true
                },
                maskValues: {
                  type: 'boolean',
                  description: '値をマスキング表示するか（デフォルト: false）',
                  default: false
                }
              },
              required: ['scriptId']
            }
          },
          {
            name: 'audit_properties',
            description: '🔍 スクリプトプロパティのセキュリティ監査を実行します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                }
              },
              required: ['scriptId']
            }
          },
          {
            name: 'backup_properties',
            description: '💾 スクリプトプロパティをバックアップします',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                includeEncrypted: {
                  type: 'boolean',
                  description: '暗号化されたままバックアップするか（デフォルト: false）',
                  default: false
                }
              },
              required: ['scriptId']
            }
          },
          {
            name: 'restore_properties',
            description: '🔄 バックアップからスクリプトプロパティを復元します',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'スクリプトID'
                },
                backup: {
                  type: 'object',
                  description: 'バックアップデータ'
                },
                verifyChecksum: {
                  type: 'boolean',
                  description: 'チェックサムを検証するか（デフォルト: true）',
                  default: true
                }
              },
              required: ['scriptId', 'backup']
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
        // 認証確認
        await this.ensureAuthenticated();

        // ツール実行
        switch (name) {
          // === プロジェクト管理 ===
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

          // === 🔒 セキュアなプロパティ管理 ===
          case 'set_secure_property':
            return await this.setSecureProperty(args);
          case 'get_secure_property':
            return await this.getSecureProperty(args);
          case 'delete_property':
            return await this.deleteProperty(args);
          case 'list_properties':
            return await this.listProperties(args);
          case 'audit_properties':
            return await this.auditProperties(args);
          case 'backup_properties':
            return await this.backupProperties(args);
          case 'restore_properties':
            return await this.restoreProperties(args);

          // === 実行・デプロイ ===
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

  // ===== ツール実装メソッド =====

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

  // ===== 🔒 セキュアなプロパティ管理メソッド =====

  async setSecureProperty(args) {
    const result = await this.propertiesManager.setSecureProperty(
      args.scriptId,
      args.key,
      args.value,
      args.encrypt !== false
    );
    
    return {
      content: [
        {
          type: 'text',
          text: `🔒 スクリプトプロパティを安全に保存しました\n\n` +
                `🔑 キー: ${args.key}\n` +
                `🛡️ 暗号化: ${result.encrypted ? '有効' : '無効'}\n` +
                `📅 保存日時: ${result.timestamp}`
        }
      ]
    };
  }

  async getSecureProperty(args) {
    const value = await this.propertiesManager.getSecureProperty(
      args.scriptId,
      args.key,
      args.decrypt !== false
    );
    
    if (value === null) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ プロパティ「${args.key}」が見つかりません`
          }
        ]
      };
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `🔓 スクリプトプロパティを取得しました\n\n` +
                `🔑 キー: ${args.key}\n` +
                `📄 値: ${value}\n` +
                `🔍 復号化: ${args.decrypt !== false ? '実行済み' : 'スキップ'}`
        }
      ]
    };
  }

  async deleteProperty(args) {
    const result = await this.propertiesManager.deleteProperty(
      args.scriptId,
      args.key
    );
    
    return {
      content: [
        {
          type: 'text',
          text: `🗑️ スクリプトプロパティを削除しました\n\n` +
                `🔑 削除されたキー: ${result.deleted}\n` +
                `📅 削除日時: ${result.timestamp}`
        }
      ]
    };
  }

  async listProperties(args) {
    const properties = await this.propertiesManager.getAllProperties(
      args.scriptId,
      args.decrypt !== false
    );
    
    let text = `📋 スクリプトプロパティ一覧 (${Object.keys(properties).length}件)\n\n`;
    
    if (Object.keys(properties).length === 0) {
      text += '設定されているプロパティはありません。';
    } else {
      Object.entries(properties).forEach(([key, value], index) => {
        const displayValue = args.maskValues ? 
          this.propertiesManager.security.maskApiKey(String(value)) : 
          String(value);
        
        text += `${index + 1}. **${key}**\n`;
        text += `   📄 値: ${displayValue}\n`;
        text += `   📏 長さ: ${String(value).length} 文字\n\n`;
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

  async auditProperties(args) {
    const audit = await this.propertiesManager.auditProperties(args.scriptId);
    
    let text = `🔍 セキュリティ監査レポート\n\n`;
    text += `📊 **統計情報**\n`;
    text += `   - 総プロパティ数: ${audit.totalProperties}\n`;
    text += `   - 暗号化済み: ${audit.encryptedProperties}\n`;
    text += `   - 平文: ${audit.plaintextProperties}\n`;
    text += `   - 機密情報の疑い: ${audit.suspiciousKeys.length}\n\n`;
    
    if (audit.suspiciousKeys.length > 0) {
      text += `⚠️ **機密情報の可能性があるキー**\n`;
      audit.suspiciousKeys.forEach(key => {
        text += `   - ${key}\n`;
      });
      text += '\n';
    }
    
    if (audit.recommendations.length > 0) {
      text += `💡 **推奨事項**\n`;
      audit.recommendations.forEach(rec => {
        text += `   - ${rec}\n`;
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

  async backupProperties(args) {
    const backup = await this.propertiesManager.backupProperties(
      args.scriptId,
      args.includeEncrypted
    );
    
    return {
      content: [
        {
          type: 'text',
          text: `💾 プロパティバックアップ完了\n\n` +
                `📊 バックアップ件数: ${backup.propertyCount}\n` +
                `🔒 暗号化形式: ${backup.includeEncrypted ? '保持' : '復号化'}\n` +
                `📅 作成日時: ${backup.timestamp}\n` +
                `🔍 チェックサム: ${backup.checksum}\n\n` +
                `💡 このバックアップデータをrestore_propertiesツールで復元できます`
        }
      ]
    };
  }

  async restoreProperties(args) {
    const result = await this.propertiesManager.restoreProperties(
      args.scriptId,
      args.backup,
      args.verifyChecksum !== false
    );
    
    return {
      content: [
        {
          type: 'text',
          text: `🔄 プロパティ復元完了\n\n` +
                `📊 復元件数: ${result.restored}\n` +
                `📅 復元日時: ${result.timestamp}\n` +
                `🔍 チェックサム検証: ${args.verifyChecksum !== false ? '実行済み' : 'スキップ'}`
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
    console.log(chalk.green('🔒 セキュリティ機能: スクリプトプロパティ暗号化対応'));
    
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
