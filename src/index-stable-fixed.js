/**
 * Google Apps Script MCP Server - 安定版
 * 依存関係問題を解決した安定動作版
 * 
 * Author: Utakata
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GoogleAppsScriptMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'google-apps-script-mcp',
        version: '1.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'clasp_setup',
            description: 'Setup Clasp CLI environment and authenticate with Google',
            inputSchema: {
              type: 'object',
              properties: {
                force: {
                  type: 'boolean',
                  description: 'Force re-setup even if already configured'
                }
              }
            }
          },
          {
            name: 'clasp_create',
            description: 'Create a new Google Apps Script project',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Title of the new project'
                },
                type: {
                  type: 'string',
                  enum: ['standalone', 'sheets', 'docs', 'slides', 'forms'],
                  description: 'Type of Google Apps Script project'
                }
              },
              required: ['title']
            }
          },
          {
            name: 'clasp_clone',
            description: 'Clone an existing Google Apps Script project',
            inputSchema: {
              type: 'object',
              properties: {
                scriptId: {
                  type: 'string',
                  description: 'Script ID of the project to clone'
                },
                versionNumber: {
                  type: 'number',
                  description: 'Version number to clone (optional)'
                }
              },
              required: ['scriptId']
            }
          },
          {
            name: 'clasp_pull',
            description: 'Pull latest changes from Google Apps Script',
            inputSchema: {
              type: 'object',
              properties: {
                versionNumber: {
                  type: 'number',
                  description: 'Version number to pull (optional)'
                }
              }
            }
          },
          {
            name: 'clasp_push_and_deploy',
            description: 'Push changes and deploy to Google Apps Script',
            inputSchema: {
              type: 'object',
              properties: {
                watch: {
                  type: 'boolean',
                  description: 'Watch for file changes and automatically push'
                },
                force: {
                  type: 'boolean',
                  description: 'Force push even if there are conflicts'
                }
              }
            }
          },
          {
            name: 'clasp_list',
            description: 'List all Google Apps Script projects',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'dependency_check',
            description: 'Check system dependencies and environment',
            inputSchema: {
              type: 'object',
              properties: {
                detailed: {
                  type: 'boolean',
                  description: 'Show detailed dependency information'
                }
              }
            }
          }
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'dependency_check':
          return await this.handleDependencyCheck(request.params.arguments);
        
        case 'clasp_setup':
          return await this.handleClaspSetup(request.params.arguments);
          
        case 'clasp_create':
          return await this.handleClaspCreate(request.params.arguments);
          
        case 'clasp_clone':
          return await this.handleClaspClone(request.params.arguments);
          
        case 'clasp_pull':
          return await this.handleClaspPull(request.params.arguments);
          
        case 'clasp_push_and_deploy':
          return await this.handleClaspPushAndDeploy(request.params.arguments);
          
        case 'clasp_list':
          return await this.handleClaspList(request.params.arguments);
          
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  async handleDependencyCheck(args) {
    try {
      const nodeVersion = process.version;
      const platform = process.platform;
      const architecture = process.arch;
      
      // 基本的なNode.js モジュールの可用性チェック
      const dependencies = {
        'fs/promises': false,
        'path': false,
        'child_process': false,
        'url': false
      };
      
      for (const dep of Object.keys(dependencies)) {
        try {
          await import(dep);
          dependencies[dep] = true;
        } catch {
          dependencies[dep] = false;
        }
      }
      
      // package.json の確認
      let packageInfo = null;
      try {
        const packagePath = path.join(__dirname, '..', 'package.json');
        const packageContent = await fs.readFile(packagePath, 'utf8');
        packageInfo = JSON.parse(packageContent);
      } catch {
        packageInfo = { error: 'package.json not found' };
      }
      
      const result = {
        status: 'success',
        environment: {
          node_version: nodeVersion,
          platform: platform,
          architecture: architecture,
          working_directory: __dirname
        },
        dependencies: dependencies,
        package_info: args?.detailed ? packageInfo : { name: packageInfo?.name, version: packageInfo?.version },
        timestamp: new Date().toISOString()
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: `依存関係チェックエラー: ${error.message}`,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      };
    }
  }

  async handleClaspSetup(args) {
    try {
      const result = {
        status: 'info',
        message: 'Clasp環境セットアップガイド',
        steps: [
          '1. Node.js 18以上がインストールされていることを確認',
          '2. npm install -g @google/clasp でClaspをグローバルインストール',
          '3. clasp login でGoogle認証を完了',
          '4. Google Apps Script APIを有効化: https://script.google.com/home/usersettings'
        ],
        next_action: 'dependency_checkツールで環境を確認してください'
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: `Claspセットアップエラー: ${error.message}`
            }, null, 2)
          }
        ]
      };
    }
  }

  async handleClaspCreate(args) {
    try {
      const result = {
        status: 'info',
        message: `Google Apps Script プロジェクト作成準備`,
        project_config: {
          title: args.title,
          type: args.type || 'standalone'
        },
        command: `clasp create --title "${args.title}" --type ${args.type || 'standalone'}`,
        note: 'このコマンドをターミナルで実行してプロジェクトを作成してください'
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: `プロジェクト作成エラー: ${error.message}`
            }, null, 2)
          }
        ]
      };
    }
  }

  async handleClaspClone(args) {
    try {
      const result = {
        status: 'info',
        message: 'Google Apps Script プロジェクトクローン準備',
        clone_config: {
          script_id: args.scriptId,
          version: args.versionNumber || 'latest'
        },
        command: args.versionNumber 
          ? `clasp clone ${args.scriptId} --versionNumber ${args.versionNumber}`
          : `clasp clone ${args.scriptId}`,
        note: 'このコマンドをターミナルで実行してプロジェクトをクローンしてください'
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: `クローンエラー: ${error.message}`
            }, null, 2)
          }
        ]
      };
    }
  }

  async handleClaspPull(args) {
    try {
      const result = {
        status: 'info',
        message: 'Google Apps Script プロジェクトプル準備',
        pull_config: {
          version: args.versionNumber || 'latest'
        },
        command: args.versionNumber 
          ? `clasp pull --versionNumber ${args.versionNumber}`
          : 'clasp pull',
        note: 'このコマンドをターミナルで実行して最新の変更を取得してください'
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: `プルエラー: ${error.message}`
            }, null, 2)
          }
        ]
      };
    }
  }

  async handleClaspPushAndDeploy(args) {
    try {
      const commands = [];
      
      if (args?.force) {
        commands.push('clasp push --force');
      } else {
        commands.push('clasp push');
      }
      
      if (args?.watch) {
        commands.push('clasp push --watch');
      }
      
      commands.push('clasp deploy');
      
      const result = {
        status: 'info',
        message: 'Google Apps Script プッシュ・デプロイ準備',
        push_config: {
          force: args?.force || false,
          watch: args?.watch || false
        },
        commands: commands,
        note: 'これらのコマンドをターミナルで順次実行してください'
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: `プッシュ・デプロイエラー: ${error.message}`
            }, null, 2)
          }
        ]
      };
    }
  }

  async handleClaspList(args) {
    try {
      const result = {
        status: 'info',
        message: 'Google Apps Script プロジェクト一覧取得',
        command: 'clasp list',
        note: 'このコマンドをターミナルで実行して利用可能なプロジェクト一覧を確認してください'
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: `プロジェクト一覧エラー: ${error.message}`
            }, null, 2)
          }
        ]
      };
    }
  }

  async run() {
    console.error('🚀 Google Apps Script MCP Server (安定版) 起動中...');
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('✅ Google Apps Script MCP Server が正常に起動しました');
  }
}

// サーバー起動
const server = new GoogleAppsScriptMCPServer();
server.run().catch(console.error);
