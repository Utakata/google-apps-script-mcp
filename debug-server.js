/**
 * Google Apps Script MCP Server - デバッグ版
 * ステップバイステップでエラー特定
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

console.log('🔍 Google Apps Script MCP Server デバッグ開始...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📂 ディレクトリ情報:');
console.log('  __filename:', __filename);
console.log('  __dirname:', __dirname);

class GoogleAppsScriptMCPServer {
  constructor() {
    console.log('🏗️ サーバーコンストラクター開始...');
    
    try {
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
      console.log('✅ サーバーインスタンス作成成功');
    } catch (error) {
      console.error('❌ サーバーインスタンス作成エラー:', error);
      throw error;
    }
    
    this.setupHandlers();
  }

  setupHandlers() {
    console.log('🔧 ハンドラー設定開始...');
    
    try {
      this.server.setRequestHandler(ListToolsRequestSchema, async () => {
        console.log('📋 ListTools リクエスト受信');
        return {
          tools: [
            {
              name: 'test_tool',
              description: 'テスト用ツール',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            }
          ],
        };
      });

      this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        console.log('🔧 CallTool リクエスト受信:', request.params.name);
        return {
          content: [
            {
              type: 'text',
              text: 'テスト成功'
            }
          ]
        };
      });
      
      console.log('✅ ハンドラー設定完了');
    } catch (error) {
      console.error('❌ ハンドラー設定エラー:', error);
      throw error;
    }
  }

  async run() {
    console.log('🚀 サーバー起動開始...');
    
    try {
      console.log('📡 StdioServerTransport 作成中...');
      const transport = new StdioServerTransport();
      console.log('✅ Transport 作成成功');
      
      console.log('🔌 サーバー接続開始...');
      await this.server.connect(transport);
      console.log('✅ サーバー接続成功');
      
      console.log('✅ Google Apps Script MCP Server が正常に起動しました');
      
      // プロセスが終了しないようにする
      process.stdin.resume();
      
    } catch (error) {
      console.error('❌ サーバー起動エラー:', error);
      console.error('🔍 スタックトレース:', error.stack);
      throw error;
    }
  }
}

// メイン実行部分
console.log('🎯 メイン実行開始...');

try {
  const server = new GoogleAppsScriptMCPServer();
  console.log('📡 run() メソッド呼び出し...');
  server.run().catch(error => {
    console.error('💥 run() 内でエラー:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('💥 メイン実行でエラー:', error);
  process.exit(1);
}

// プロセス終了をキャッチ
process.on('exit', (code) => {
  console.log(`🏁 プロセス終了 (コード: ${code})`);
});

process.on('SIGTERM', () => {
  console.log('📡 SIGTERM受信');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📡 SIGINT受信');
  process.exit(0);
});
