/**
 * Google認証処理モジュール
 * 
 * Google Apps Script APIの認証を管理
 * - Service Account認証
 * - OAuth2.0認証 
 * - APIクライアント初期化
 * 
 * Author: UtaNote
 */

import { GoogleAuth as GoogleAuthLib } from 'google-auth-library';
import { google } from 'googleapis';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class GoogleAuth {
  constructor() {
    this.auth = null;
    this.credentials = null;
    this.isAuthenticatedFlag = false;
    
    // 必要なスコープ
    this.scopes = [
      'https://www.googleapis.com/auth/script.projects',
      'https://www.googleapis.com/auth/script.processes',
      'https://www.googleapis.com/auth/script.deployments',
      'https://www.googleapis.com/auth/script.metrics',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ];
  }

  /**
   * 認証状態を確認
   */
  isAuthenticated() {
    return this.isAuthenticatedFlag && this.auth !== null;
  }

  /**
   * 認証処理
   */
  async authenticate() {
    try {
      console.log('🔐 Google認証を開始しています...');

      // 環境変数から認証情報を取得
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;

      if (serviceAccountKey) {
        // Service Account認証（推奨）
        await this.authenticateWithServiceAccount(serviceAccountKey);
      } else if (credentialsPath) {
        // OAuth2.0認証
        await this.authenticateWithOAuth(credentialsPath);
      } else {
        // アプリケーションデフォルト認証を試行
        await this.authenticateWithDefault();
      }

      this.isAuthenticatedFlag = true;
      console.log('✅ Google認証が完了しました');
      
    } catch (error) {
      console.error('❌ Google認証に失敗しました:', error.message);
      throw new Error(`認証失敗: ${error.message}`);
    }
  }

  /**
   * Service Account認証
   */
  async authenticateWithServiceAccount(serviceAccountKey) {
    try {
      // Service Accountキーの解析
      let keyData;
      if (serviceAccountKey.startsWith('{')) {
        keyData = JSON.parse(serviceAccountKey);
      } else {
        // ファイルパスとして扱う
        keyData = await fs.readJson(serviceAccountKey);
      }

      // GoogleAuthインスタンス作成
      const auth = new GoogleAuthLib({
        credentials: keyData,
        scopes: this.scopes
      });

      this.auth = auth;
      this.credentials = keyData;
      
      console.log('🔑 Service Account認証を設定しました');
      
    } catch (error) {
      throw new Error(`Service Account認証失敗: ${error.message}`);
    }
  }

  /**
   * OAuth2.0認証
   */
  async authenticateWithOAuth(credentialsPath) {
    try {
      const credentials = await fs.readJson(credentialsPath);
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      // トークンファイルの確認
      const tokenPath = path.join(__dirname, '../../config/token.json');
      
      if (await fs.pathExists(tokenPath)) {
        // 既存トークンを読み込み
        const token = await fs.readJson(tokenPath);
        oAuth2Client.setCredentials(token);
        this.auth = oAuth2Client;
        console.log('🔑 既存のOAuth2.0トークンを使用しました');
      } else {
        // 新しい認証フローを開始
        await this.performOAuthFlow(oAuth2Client, tokenPath);
      }
      
    } catch (error) {
      throw new Error(`OAuth2.0認証失敗: ${error.message}`);
    }
  }

  /**
   * OAuth認証フロー実行
   */
  async performOAuthFlow(oAuth2Client, tokenPath) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes
    });

    console.log('🌐 以下のURLにアクセスして認証を完了してください:');
    console.log(authUrl);
    console.log('');
    console.log('認証コードを環境変数 GOOGLE_AUTH_CODE に設定してください');
    
    const authCode = process.env.GOOGLE_AUTH_CODE;
    if (!authCode) {
      throw new Error('認証コードが設定されていません。GOOGLE_AUTH_CODE環境変数を設定してください。');
    }

    const { tokens } = await oAuth2Client.getToken(authCode);
    oAuth2Client.setCredentials(tokens);

    // トークンを保存
    await fs.ensureDir(path.dirname(tokenPath));
    await fs.writeJson(tokenPath, tokens);

    this.auth = oAuth2Client;
    console.log('✅ OAuth2.0認証が完了し、トークンが保存されました');
  }

  /**
   * アプリケーションデフォルト認証
   */
  async authenticateWithDefault() {
    try {
      const auth = new GoogleAuthLib({
        scopes: this.scopes
      });

      this.auth = auth;
      console.log('🔑 アプリケーションデフォルト認証を使用しました');
      
    } catch (error) {
      throw new Error(`デフォルト認証失敗: ${error.message}`);
    }
  }

  /**
   * Google Apps Script APIクライアントを取得
   */
  getScriptApi() {
    if (!this.isAuthenticated()) {
      throw new Error('認証が完了していません。先にauthenticate()を呼び出してください。');
    }

    return google.script({ version: 'v1', auth: this.auth });
  }

  /**
   * Google Drive APIクライアントを取得
   */
  getDriveApi() {
    if (!this.isAuthenticated()) {
      throw new Error('認証が完了していません。先にauthenticate()を呼び出してください。');
    }

    return google.drive({ version: 'v3', auth: this.auth });
  }

  /**
   * 認証クライアントを取得
   */
  getAuthClient() {
    return this.auth;
  }

  /**
   * 認証情報をリセット
   */
  reset() {
    this.auth = null;
    this.credentials = null;
    this.isAuthenticatedFlag = false;
    console.log('🔄 認証情報をリセットしました');
  }

  /**
   * 認証情報の詳細を取得
   */
  async getAuthInfo() {
    if (!this.isAuthenticated()) {
      return { authenticated: false };
    }

    try {
      const authClient = this.getAuthClient();
      const accessToken = await authClient.getAccessToken();
      
      return {
        authenticated: true,
        scopes: this.scopes,
        hasAccessToken: !!accessToken.token,
        authType: this.credentials ? 'Service Account' : 'OAuth2.0'
      };
    } catch (error) {
      return {
        authenticated: false,
        error: error.message
      };
    }
  }

  /**
   * アクセストークンの有効性を確認
   */
  async validateToken() {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      const authClient = this.getAuthClient();
      await authClient.getAccessToken();
      return true;
    } catch (error) {
      console.warn('⚠️ アクセストークンが無効です:', error.message);
      return false;
    }
  }

  /**
   * トークンの更新
   */
  async refreshToken() {
    if (!this.isAuthenticated()) {
      throw new Error('認証が完了していません');
    }

    try {
      const authClient = this.getAuthClient();
      if (authClient.refreshAccessToken) {
        await authClient.refreshAccessToken();
        console.log('🔄 アクセストークンを更新しました');
      }
    } catch (error) {
      console.error('❌ トークン更新に失敗しました:', error.message);
      throw error;
    }
  }
}
