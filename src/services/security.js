/**
 * セキュリティ管理モジュール
 * 
 * Google Apps Scriptのスクリプトプロパティを活用した
 * セキュアな情報管理とアクセス制御
 * 
 * Author: UtaNote
 */

import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export class SecurityManager {
  constructor() {
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * 暗号化キーの取得または生成
   */
  getOrCreateEncryptionKey() {
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey) {
      return Buffer.from(envKey, 'hex');
    }
    
    // 新しい暗号化キーを生成
    const key = crypto.randomBytes(32);
    logger.warn('⚠️ 新しい暗号化キーが生成されました。ENCRYPTION_KEY環境変数に設定することを推奨します:');
    logger.warn(`ENCRYPTION_KEY=${key.toString('hex')}`);
    return key;
  }

  /**
   * データを暗号化
   */
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from('gas-mcp', 'utf8'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      logger.error(`❌ 暗号化エラー: ${error.message}`);
      throw new Error(`暗号化失敗: ${error.message}`);
    }
  }

  /**
   * データを復号化
   */
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAAD(Buffer.from('gas-mcp', 'utf8'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error(`❌ 復号化エラー: ${error.message}`);
      throw new Error(`復号化失敗: ${error.message}`);
    }
  }

  /**
   * APIキーをマスキング表示
   */
  maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) {
      return '***';
    }
    return `${apiKey.substring(0, 4)}***${apiKey.substring(apiKey.length - 4)}`;
  }

  /**
   * セキュアなランダム文字列生成
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * パスワード強度チェック
   */
  validatePasswordStrength(password) {
    const minLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const issues = [];
    
    if (password.length < minLength) {
      issues.push(`最低${minLength}文字必要`);
    }
    if (!hasUpperCase) {
      issues.push('大文字が必要');
    }
    if (!hasLowerCase) {
      issues.push('小文字が必要');
    }
    if (!hasNumbers) {
      issues.push('数字が必要');
    }
    if (!hasSpecialChar) {
      issues.push('特殊文字が必要');
    }

    return {
      isValid: issues.length === 0,
      issues: issues,
      score: Math.max(0, 5 - issues.length) / 5 * 100
    };
  }

  /**
   * データハッシュ生成
   */
  createHash(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * HMAC署名生成
   */
  createHMAC(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * HMAC署名検証
   */
  verifyHMAC(data, signature, secret) {
    const expectedSignature = this.createHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}

export class PropertiesManager {
  constructor(gasApi) {
    this.gasApi = gasApi;
    this.security = new SecurityManager();
  }

  /**
   * スクリプトプロパティにセキュアにデータを保存
   */
  async setSecureProperty(scriptId, key, value, encrypt = true) {
    try {
      logger.info(`🔒 スクリプトプロパティ設定: ${key}`);
      
      let finalValue = value;
      if (encrypt && typeof value === 'string') {
        const encrypted = this.security.encrypt(value);
        finalValue = JSON.stringify({
          _encrypted: true,
          data: encrypted,
          timestamp: new Date().toISOString()
        });
      }

      // PropertiesServiceを使用してプロパティを設定するGASコードを生成
      const gasCode = this.generatePropertiesSetCode(key, finalValue);
      
      // 一時的なGAS関数を作成して実行
      await this.executePropertiesOperation(scriptId, 'setProperty', gasCode);
      
      logger.success(`✅ プロパティ「${key}」を安全に保存しました`);
      
      return {
        key: key,
        encrypted: encrypt,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error(`❌ プロパティ設定エラー: ${error.message}`);
      throw new Error(`プロパティ設定失敗: ${error.message}`);
    }
  }

  /**
   * スクリプトプロパティからセキュアにデータを取得
   */
  async getSecureProperty(scriptId, key, decrypt = true) {
    try {
      logger.info(`🔓 スクリプトプロパティ取得: ${key}`);
      
      // PropertiesServiceを使用してプロパティを取得するGASコードを生成
      const gasCode = this.generatePropertiesGetCode(key);
      
      // 一時的なGAS関数を作成して実行
      const result = await this.executePropertiesOperation(scriptId, 'getProperty', gasCode);
      
      if (!result || !result.response || !result.response.result) {
        return null;
      }
      
      const rawValue = result.response.result;
      
      if (!decrypt || !rawValue) {
        return rawValue;
      }

      // 暗号化されたデータかチェック
      try {
        const parsed = JSON.parse(rawValue);
        if (parsed._encrypted && parsed.data) {
          const decrypted = this.security.decrypt(parsed.data);
          logger.success(`✅ プロパティ「${key}」を復号化しました`);
          return decrypted;
        }
      } catch (parseError) {
        // JSON解析に失敗した場合は、平文として扱う
      }
      
      return rawValue;
      
    } catch (error) {
      logger.error(`❌ プロパティ取得エラー: ${error.message}`);
      throw new Error(`プロパティ取得失敗: ${error.message}`);
    }
  }

  /**
   * スクリプトプロパティを削除
   */
  async deleteProperty(scriptId, key) {
    try {
      logger.info(`🗑️ スクリプトプロパティ削除: ${key}`);
      
      const gasCode = this.generatePropertiesDeleteCode(key);
      await this.executePropertiesOperation(scriptId, 'deleteProperty', gasCode);
      
      logger.success(`✅ プロパティ「${key}」を削除しました`);
      
      return {
        deleted: key,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error(`❌ プロパティ削除エラー: ${error.message}`);
      throw new Error(`プロパティ削除失敗: ${error.message}`);
    }
  }

  /**
   * すべてのスクリプトプロパティを取得
   */
  async getAllProperties(scriptId, decrypt = true) {
    try {
      logger.info('📋 全スクリプトプロパティ取得');
      
      const gasCode = this.generatePropertiesGetAllCode();
      const result = await this.executePropertiesOperation(scriptId, 'getAllProperties', gasCode);
      
      if (!result || !result.response || !result.response.result) {
        return {};
      }
      
      const properties = result.response.result;
      const decryptedProperties = {};
      
      for (const [key, value] of Object.entries(properties)) {
        if (decrypt) {
          try {
            const parsed = JSON.parse(value);
            if (parsed._encrypted && parsed.data) {
              decryptedProperties[key] = this.security.decrypt(parsed.data);
            } else {
              decryptedProperties[key] = value;
            }
          } catch (parseError) {
            decryptedProperties[key] = value;
          }
        } else {
          decryptedProperties[key] = value;
        }
      }
      
      logger.success(`✅ ${Object.keys(decryptedProperties).length}件のプロパティを取得しました`);
      
      return decryptedProperties;
      
    } catch (error) {
      logger.error(`❌ 全プロパティ取得エラー: ${error.message}`);
      throw new Error(`全プロパティ取得失敗: ${error.message}`);
    }
  }

  /**
   * プロパティ設定用GASコード生成
   */
  generatePropertiesSetCode(key, value) {
    return `
function setProperty() {
  try {
    PropertiesService.getScriptProperties().setProperty('${key}', ${JSON.stringify(value)});
    return { success: true, key: '${key}' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}`;
  }

  /**
   * プロパティ取得用GASコード生成
   */
  generatePropertiesGetCode(key) {
    return `
function getProperty() {
  try {
    const value = PropertiesService.getScriptProperties().getProperty('${key}');
    return value;
  } catch (error) {
    throw new Error('プロパティ取得エラー: ' + error.toString());
  }
}`;
  }

  /**
   * プロパティ削除用GASコード生成
   */
  generatePropertiesDeleteCode(key) {
    return `
function deleteProperty() {
  try {
    PropertiesService.getScriptProperties().deleteProperty('${key}');
    return { success: true, deleted: '${key}' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}`;
  }

  /**
   * 全プロパティ取得用GASコード生成
   */
  generatePropertiesGetAllCode() {
    return `
function getAllProperties() {
  try {
    const properties = PropertiesService.getScriptProperties().getProperties();
    return properties;
  } catch (error) {
    throw new Error('全プロパティ取得エラー: ' + error.toString());
  }
}`;
  }

  /**
   * プロパティ操作を実行
   */
  async executePropertiesOperation(scriptId, operation, gasCode) {
    try {
      // 一時的なファイルを作成
      const tempFileName = `temp_${operation}_${Date.now()}`;
      
      await this.gasApi.createFile(scriptId, tempFileName, 'SERVER_JS', gasCode);
      
      // 関数を実行
      const result = await this.gasApi.executeFunction(scriptId, operation);
      
      // 一時的なファイルを削除
      await this.gasApi.deleteFile(scriptId, tempFileName);
      
      return result;
      
    } catch (error) {
      logger.error(`❌ プロパティ操作エラー: ${error.message}`);
      throw error;
    }
  }

  /**
   * セキュリティ監査
   */
  async auditProperties(scriptId) {
    try {
      logger.info('🔍 プロパティセキュリティ監査開始');
      
      const properties = await this.getAllProperties(scriptId, false);
      const audit = {
        totalProperties: Object.keys(properties).length,
        encryptedProperties: 0,
        plaintextProperties: 0,
        suspiciousKeys: [],
        recommendations: []
      };

      const sensitiveKeywords = [
        'api_key', 'apikey', 'secret', 'password', 'token', 'auth',
        'credential', 'private', 'key', 'pass', 'pwd'
      ];

      for (const [key, value] of Object.entries(properties)) {
        try {
          const parsed = JSON.parse(value);
          if (parsed._encrypted) {
            audit.encryptedProperties++;
          } else {
            audit.plaintextProperties++;
          }
        } catch {
          audit.plaintextProperties++;
          
          // 機密情報の可能性があるキーをチェック
          const keyLower = key.toLowerCase();
          const isSensitive = sensitiveKeywords.some(keyword => 
            keyLower.includes(keyword)
          );
          
          if (isSensitive) {
            audit.suspiciousKeys.push(key);
          }
        }
      }

      // 推奨事項を生成
      if (audit.suspiciousKeys.length > 0) {
        audit.recommendations.push(
          `機密情報の可能性があるキー${audit.suspiciousKeys.length}件を暗号化することを推奨: ${audit.suspiciousKeys.join(', ')}`
        );
      }

      if (audit.plaintextProperties > audit.encryptedProperties) {
        audit.recommendations.push(
          '平文プロパティが暗号化プロパティより多いです。セキュリティ強化を検討してください。'
        );
      }

      if (audit.totalProperties === 0) {
        audit.recommendations.push('プロパティが設定されていません。');
      }

      logger.success('✅ セキュリティ監査完了');
      
      return audit;
      
    } catch (error) {
      logger.error(`❌ セキュリティ監査エラー: ${error.message}`);
      throw new Error(`セキュリティ監査失敗: ${error.message}`);
    }
  }

  /**
   * プロパティのバックアップ
   */
  async backupProperties(scriptId, includeEncrypted = false) {
    try {
      logger.info('💾 プロパティバックアップ開始');
      
      const properties = await this.getAllProperties(scriptId, !includeEncrypted);
      
      const backup = {
        timestamp: new Date().toISOString(),
        scriptId: scriptId,
        propertyCount: Object.keys(properties).length,
        includeEncrypted: includeEncrypted,
        properties: properties,
        checksum: this.security.createHash(JSON.stringify(properties))
      };
      
      logger.success(`✅ ${backup.propertyCount}件のプロパティをバックアップしました`);
      
      return backup;
      
    } catch (error) {
      logger.error(`❌ プロパティバックアップエラー: ${error.message}`);
      throw new Error(`プロパティバックアップ失敗: ${error.message}`);
    }
  }

  /**
   * プロパティの復元
   */
  async restoreProperties(scriptId, backup, verifyChecksum = true) {
    try {
      logger.info('🔄 プロパティ復元開始');
      
      if (verifyChecksum) {
        const currentChecksum = this.security.createHash(JSON.stringify(backup.properties));
        if (currentChecksum !== backup.checksum) {
          throw new Error('バックアップファイルのチェックサムが一致しません');
        }
      }

      let restoredCount = 0;
      for (const [key, value] of Object.entries(backup.properties)) {
        await this.setSecureProperty(scriptId, key, value, !backup.includeEncrypted);
        restoredCount++;
      }
      
      logger.success(`✅ ${restoredCount}件のプロパティを復元しました`);
      
      return {
        restored: restoredCount,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error(`❌ プロパティ復元エラー: ${error.message}`);
      throw new Error(`プロパティ復元失敗: ${error.message}`);
    }
  }
}
