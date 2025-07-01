/**
 * 最小限のMCPサーバーテスト
 * エラー特定用
 */

console.log('🔍 MCPサーバーテスト開始...');

try {
  console.log('📦 @modelcontextprotocol/sdk のインポートを試行...');
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  console.log('✅ Server import 成功');
  
  console.log('📦 StdioServerTransport のインポートを試行...');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  console.log('✅ StdioServerTransport import 成功');

  console.log('📦 スキーマのインポートを試行...');
  const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
  } = await import('@modelcontextprotocol/sdk/types.js');
  console.log('✅ Schema import 成功');

  console.log('🏗️ サーバーインスタンス作成を試行...');
  const server = new Server(
    {
      name: 'test-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  console.log('✅ サーバーインスタンス作成成功');

  console.log('🔧 ハンドラー設定を試行...');
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: [] };
  });
  console.log('✅ ハンドラー設定成功');

  console.log('🚀 基本的なMCPコンポーネント動作確認完了');
  console.log('✅ 全ての基本インポートが正常動作');

} catch (error) {
  console.error('❌ エラー発生:', error.message);
  console.error('🔍 スタックトレース:', error.stack);
  process.exit(1);
}
