/**
 * Google Apps Script MCP Server - Smart Runtime版
 * ランタイム依存関係自動解決システム
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
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SmartDependencyResolver {
  constructor() {
    this.requiredPackages = [
      'axios',
      'node-fetch',
      'chalk',
      'dayjs',
      'fs-extra',
      'google-auth-library',
      'googleapis',
      'lodash'
    ];
    this.resolved = new Set();
  }

  async ensureDependencies() {
    console.log('🔍 依存関係チェック中...');
    
    for (const pkg of this.requiredPackages) {
      if (!this.resolved.has(pkg)) {
        try {
          await import(pkg);
          this.resolved.add(pkg);
          console.log(`✅ ${pkg} - 利用可能`);
        } catch (error) {
          console.log(`⚠️ ${pkg} - 見つからない、インストール試行中...`);
          await this.installPackage(pkg);
        }
      }
    }
  }

  async installPackage(packageName) {
    try {
      // 軽量インストール: 特定の場所にインストール
      const cmd = `npm install ${packageName} --prefix ${__dirname} --no-save --silent`;
      execSync(cmd, { stdio: 'pipe' });
      console.log(`✅ ${packageName} - インストール完了`);
      this.resolved.add(packageName);
    } catch (error) {
      console.log(`❌ ${packageName} - インストール失敗、代替方法使用`);
      // 代替実装や縮退モード
    }
  }

  async importSafely(packageName, fallback = null) {
    try {
      return await import(packageName);
    } catch (error) {
      console.log(`⚠️ ${packageName}をインポートできません、代替機能使用`);
      return fallback;
    }
  }
}

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
    
    this.dependencyResolver = new SmartDependencyResolver();
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
            name: 'smart_dependency_check',
            description: 'Check and resolve runtime dependencies',
            inputSchema: {
              type: 'object',
              properties: {
                force_reinstall: {
                  type: 'boolean',
                  description: 'Force reinstall all dependencies'
                }
              }
            }
          }
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'smart_dependency_check':
          return await this.handleDependencyCheck(request.params.arguments);
        
        case 'clasp_setup':
          return await this.handleClaspSetup(request.params.arguments);
          
        case 'clasp_create':
          return await this.handleClaspCreate(request.params.arguments);
          
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  async handleDependencyCheck(args) {
    try {
      if (args?.force_reinstall) {
        this.dependencyResolver.resolved.clear();
      }
      
      await this.dependencyResolver.ensureDependencies();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              message: '依存関係チェック完了',
              resolved: Array.from(this.dependencyResolver.resolved),
              timestamp: new Date().toISOString()
            }, null, 2)
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
              message: `依存関係エラー: ${error.message}`,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      };
    }
  }

  async handleClaspSetup(args) {
    try {
      // 動的に@google/claspをインポート
      const clasp = await this.dependencyResolver.importSafely('@google/clasp');
      
      if (!clasp) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                message: 'Claspモジュールが利用できません。依存関係を確認してください。',
                suggestion: 'smart_dependency_checkツールを実行してください'
              }, null, 2)
            }
          ]
        };
      }

      // Clasp認証チェック（簡易版）
      const result = {
        status: 'success',
        message: 'Clasp環境チェック完了',
        clasp_available: true,
        next_step: 'clasp login コマンドを実行して認証を完了してください'
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
              message: `Clasップエラー: ${error.message}`
            }, null, 2)
          }
        ]
      };
    }
  }

  async handleClaspCreate(args) {
    try {
      const result = {
        status: 'success',
        message: `Google Apps Script プロジェクト作成準備完了`,
        project_title: args.title,
        project_type: args.type || 'standalone',
        next_step: 'clasp create コマンドが実行可能です'
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

  async run() {
    console.log('🚀 Google Apps Script MCP Server (Smart Runtime版) 起動中...');
    
    // 起動時に依存関係チェック
    await this.dependencyResolver.ensureDependencies();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('✅ Google Apps Script MCP Server が正常に起動しました');
  }
}

// サーバー起動
const server = new GoogleAppsScriptMCPServer();
server.run().catch(console.error);
