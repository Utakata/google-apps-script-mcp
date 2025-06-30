/**
 * 環境変数バリデーション
 * 
 * 必要な環境変数の確認と検証
 * 
 * Author: UtaNote
 */

import { logger } from './logger.js';

/**
 * 環境変数を検証
 */
export function validateEnvironment() {
  logger.info('🔍 環境変数を検証中...');

  const errors = [];
  const warnings = [];

  // 必須環境変数
  const requiredEnvs = [];

  // 推奨環境変数
  const recommendedEnvs = [
    {
      name: 'GOOGLE_SERVICE_ACCOUNT_KEY',
      description: 'Google Service Accountキー（JSON文字列またはファイルパス）'
    },
    {
      name: 'GOOGLE_CREDENTIALS_PATH',
      description: 'Google OAuth2.0認証情報ファイルパス'
    },
    {
      name: 'GOOGLE_AUTH_CODE',
      description: 'OAuth認証コード（初回認証時のみ）'
    }
  ];

  // オプション環境変数
  const optionalEnvs = [
    {
      name: 'LOG_LEVEL',
      description: 'ログレベル (debug, info, warn, error)',
      default: 'info'
    },
    {
      name: 'MCP_SERVER_NAME',
      description: 'MCPサーバー名',
      default: 'google-apps-script-mcp'
    }
  ];

  // 必須環境変数チェック
  for (const env of requiredEnvs) {
    if (!process.env[env.name]) {
      errors.push(`❌ 必須環境変数 ${env.name} が設定されていません: ${env.description}`);
    }
  }

  // 推奨環境変数チェック
  const hasAnyAuth = recommendedEnvs.some(env => process.env[env.name]);
  if (!hasAnyAuth) {
    warnings.push('⚠️ 認証用環境変数が設定されていません。以下のいずれかを設定してください:');
    recommendedEnvs.forEach(env => {
      warnings.push(`  - ${env.name}: ${env.description}`);
    });
  }

  // Google Apps Script API有効化チェック
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_CREDENTIALS_PATH) {
    logger.info('✅ Google認証情報が設定されています');
  }

  // ログレベル検証
  const logLevel = process.env.LOG_LEVEL;
  if (logLevel && !['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    warnings.push(`⚠️ 無効なログレベル: ${logLevel}. 有効な値: debug, info, warn, error`);
  }

  // エラーがある場合は終了
  if (errors.length > 0) {
    logger.error('❌ 環境変数エラー:');
    errors.forEach(error => logger.error(error));
    
    logger.error('\n📖 セットアップガイド:');
    logger.error('1. Google Cloud Console でプロジェクトを作成');
    logger.error('2. Google Apps Script API を有効化');
    logger.error('3. 認証情報を作成 (Service Account または OAuth2.0)');
    logger.error('4. 環境変数を設定');
    
    process.exit(1);
  }

  // 警告を表示
  if (warnings.length > 0) {
    warnings.forEach(warning => logger.warn(warning));
  }

  // オプション環境変数の表示
  logger.info('📋 環境変数の状況:');
  
  optionalEnvs.forEach(env => {
    const value = process.env[env.name] || env.default;
    const status = process.env[env.name] ? '✅' : '📝';
    logger.info(`${status} ${env.name}: ${value || '未設定'}`);
  });

  logger.success('✅ 環境変数の検証が完了しました');
}

/**
 * 認証方法を判定
 */
export function detectAuthMethod() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return {
      method: 'service_account',
      description: 'Service Account認証',
      recommended: true
    };
  }
  
  if (process.env.GOOGLE_CREDENTIALS_PATH) {
    return {
      method: 'oauth',
      description: 'OAuth2.0認証',
      recommended: true
    };
  }
  
  return {
    method: 'default',
    description: 'アプリケーションデフォルト認証',
    recommended: false
  };
}

/**
 * 環境変数のサンプル値を生成
 */
export function generateEnvSample() {
  const sample = `# Google Apps Script MCP Server 環境変数設定

# === Google認証設定 (いずれか1つを設定) ===

# Option 1: Service Account認証 (推奨)
# GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
# または
# GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json

# Option 2: OAuth2.0認証
# GOOGLE_CREDENTIALS_PATH=/path/to/credentials.json
# GOOGLE_AUTH_CODE=your_oauth_authorization_code

# === オプション設定 ===

# ログレベル (debug, info, warn, error)
LOG_LEVEL=info

# MCPサーバー名
MCP_SERVER_NAME=google-apps-script-mcp

# === セットアップ手順 ===
# 1. Google Cloud Console でプロジェクトを作成
# 2. Google Apps Script API を有効化  
# 3. 認証情報を作成:
#    - Service Account: サービスアカウントキーをダウンロード
#    - OAuth2.0: OAuth2.0クライアントIDを作成
# 4. 上記の環境変数を設定
# 5. MCPサーバーを起動

# === 必要なスコープ ===
# - https://www.googleapis.com/auth/script.projects
# - https://www.googleapis.com/auth/script.processes  
# - https://www.googleapis.com/auth/script.deployments
# - https://www.googleapis.com/auth/script.metrics
# - https://www.googleapis.com/auth/drive.file
# - https://www.googleapis.com/auth/drive.metadata.readonly
`;

  return sample;
}

/**
 * 設定状況を表示
 */
export function displaySetupStatus() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 Google Apps Script MCP Server セットアップ状況');
  console.log('='.repeat(60));

  const authMethod = detectAuthMethod();
  
  console.log(`\n📝 認証方法: ${authMethod.description}`);
  console.log(`${authMethod.recommended ? '✅' : '⚠️'} 推奨度: ${authMethod.recommended ? '高' : '低'}`);

  if (!authMethod.recommended) {
    console.log('\n💡 推奨セットアップ:');
    console.log('1. Google Cloud Console でService Accountを作成');
    console.log('2. 必要なスコープを付与');
    console.log('3. GOOGLE_SERVICE_ACCOUNT_KEY 環境変数を設定');
  }

  console.log('\n🔗 有用なリンク:');
  console.log('- Google Cloud Console: https://console.cloud.google.com/');
  console.log('- Apps Script API: https://developers.google.com/apps-script/api/how-tos/execute');
  console.log('- MCP プロトコル: https://spec.modelcontextprotocol.io/');

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * 環境変数のマスキング表示
 */
export function maskSensitiveValue(key, value) {
  const sensitiveKeys = [
    'GOOGLE_SERVICE_ACCOUNT_KEY',
    'GOOGLE_AUTH_CODE',
    'API_KEY',
    'SECRET',
    'TOKEN'
  ];

  const isSensitive = sensitiveKeys.some(sensitiveKey => 
    key.toUpperCase().includes(sensitiveKey)
  );

  if (!isSensitive) {
    return value;
  }

  if (!value) {
    return '未設定';
  }

  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }

  return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
}
