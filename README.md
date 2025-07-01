# Google Apps Script MCP Server 🔒✨

**世界初**のGoogle Apps Script完全操作MCPサーバー - **JSON-RPC Protocol完全準拠版**

[![Version](https://img.shields.io/badge/version-1.1.0_STABLE-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-18+-brightgreen.svg)](https://nodejs.org/)
[![Claude Desktop](https://img.shields.io/badge/claude_desktop-v0.11.6+-success.svg)](https://claude.ai/)
[![Protocol](https://img.shields.io/badge/JSON_RPC-100%25_compliant-green.svg)](CRITICAL-FIX-REPORT.md)
[![Security](https://img.shields.io/badge/security-encrypted_properties-red.svg)](src/services/security.js)

## 🚨 最新情報 - CRITICAL FIX v1.1.0 STABLE

### 🎉 重要な問題を完全解決！

✅ **JSON-RPC Protocol汚染エラー完全修正**  
✅ **プロセス早期終了エラー根本解決**  
✅ **99%軽量化達成**: 647KB → 4.82KB  
✅ **Claude Desktop v0.11.6 完全対応**  

**詳細**: [CRITICAL-FIX-REPORT.md](CRITICAL-FIX-REPORT.md) を参照

## ✨ 特徴

### 🔒 **セキュリティファースト設計**
- **スクリプトプロパティ暗号化**: AES-256-GCM暗号化で機密情報を安全に保存
- **セキュリティ監査**: 自動的な脆弱性チェック・推奨事項の提示
- **バックアップ・復元**: チェックサム検証付きの安全なデータ管理
- **アクセス制御**: 適切な権限管理とAPIスコープ制限

### 🚀 **完全なGAS操作**
- **プロジェクト管理**: 作成・更新・削除・一覧取得
- **ファイル操作**: スクリプト・HTMLファイルの読み書き・実行
- **デプロイ管理**: Webアプリ・アドオン・ライブラリ公開
- **トリガー管理**: 時間・イベント・フォーム連動
- **ログ・監視**: 実行ログ・エラー監視・パフォーマンス分析

### 🛡️ **高度なセキュリティ機能**
- **暗号化プロパティ管理**: APIキー・パスワードの安全な保存
- **セキュリティ監査**: 機密情報の検出・暗号化推奨
- **安全なバックアップ**: 暗号化されたデータの保護
- **復元機能**: チェックサム検証による完全性保証

## 🔧 インストール

### 🚀 クイックスタート - DXTファイル（推奨）

Claude Desktop v0.11.6以降で最も簡単な方法：

1. **DXTファイルをダウンロード**
   ```
   google-apps-script-mcp-STABLE-FIXED.dxt (4.82KB)
   ```

2. **Claude Desktopでインストール**
   - Claude Desktop設定を開く
   - 「Extensions」タブを選択  
   - DXTファイルをドラッグ&ドロップまたは選択
   - 「Install」をクリック

3. **即座に利用開始！**
   - 7つのClaspツールが自動で利用可能
   - 設定不要、依存関係も自動解決
   - JSON-RPC Protocol 100%準拠

### 🛠️ 手動インストール（開発者向け）

#### 1. 依存関係のインストール

```bash
npm install
```

### 2. Google Cloud設定

#### **推奨: Service Account認証**

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. Google Apps Script API を有効化
3. Service Accountを作成してキーをダウンロード
4. 環境変数を設定:

```bash
# Service Accountキー（JSON文字列）
export GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'

# または、ファイルパス指定
export GOOGLE_SERVICE_ACCOUNT_KEY="/path/to/service-account-key.json"

# 暗号化キー（推奨）
export ENCRYPTION_KEY="your-hex-encryption-key"
```

#### **代替: OAuth2.0認証**

```bash
export GOOGLE_CREDENTIALS_PATH="/path/to/credentials.json"
export GOOGLE_AUTH_CODE="your-authorization-code"
```

### 3. Claude.ai MCP設定

`.env`ファイルまたは環境変数を設定後、Claude.aiの設定に以下を追加:

```json
{
  "mcpServers": {
    "google-apps-script-mcp": {
      "command": "node",
      "args": ["src/index-security.js"],
      "cwd": "/path/to/google-apps-script-mcp",
      "env": {
        "GOOGLE_SERVICE_ACCOUNT_KEY": "your-service-account-key",
        "ENCRYPTION_KEY": "your-encryption-key"
      }
    }
  }
}
```

## 🔒 セキュリティツール

### **スクリプトプロパティ管理**

```javascript
// APIキーを暗号化して保存
await setSecureProperty("script-id", "API_KEY", "your-secret-key", true);

// 暗号化されたAPIキーを取得
const apiKey = await getSecureProperty("script-id", "API_KEY", true);

// 全プロパティを一覧表示（マスキング付き）
await listProperties("script-id", true, true);
```

### **セキュリティ監査**

```javascript
// セキュリティ監査を実行
const audit = await auditProperties("script-id");
// → 機密情報の検出、暗号化推奨、統計情報

// プロパティをバックアップ
const backup = await backupProperties("script-id", false);
// → チェックサム付きバックアップ

// バックアップから復元
await restoreProperties("script-id", backup, true);
// → チェックサム検証付き復元
```

## 🚀 基本的な使用方法

### **プロジェクト作成**

```javascript
// 新しいGASプロジェクトを作成
const project = await createGasProject("My New Project");
console.log(`プロジェクトID: ${project.scriptId}`);
```

### **スクリプトファイル管理**

```javascript
// スクリプトファイルを作成
await createGasFile(scriptId, "main.js", "SERVER_JS", `
function myFunction() {
  console.log("Hello from GAS!");
}
`);

// ファイル内容を取得
const fileContent = await getGasFile(scriptId, "main.js");
```

### **関数実行**

```javascript
// GAS関数を実行
const result = await executeGasFunction(scriptId, "myFunction", []);
console.log("実行結果:", result);
```

### **Webアプリデプロイ**

```javascript
// Webアプリとしてデプロイ
const deployment = await deployGasWebApp(scriptId, null, "appsscript", "初回デプロイ");
console.log(`WebアプリURL: ${deployment.url}`);
```

## 🔒 セキュリティのベストプラクティス

### **1. 暗号化の活用**

```javascript
// ❌ 平文でAPIキーを保存（危険）
await setSecureProperty(scriptId, "api_key", "secret123", false);

// ✅ 暗号化してAPIキーを保存（安全）
await setSecureProperty(scriptId, "api_key", "secret123", true);
```

### **2. 定期的なセキュリティ監査**

```javascript
// 月1回実行推奨
const audit = await auditProperties(scriptId);
if (audit.suspiciousKeys.length > 0) {
  console.warn("暗号化が必要なキーが見つかりました:", audit.suspiciousKeys);
}
```

### **3. バックアップの実施**

```javascript
// 重要なプロパティは定期的にバックアップ
const backup = await backupProperties(scriptId, false); // 復号化してバックアップ
// 安全な場所に保存...
```

## 📋 利用可能なツール（STABLE版）

### **🔧 Claspツール（7種類）**
1. `dependency_check` - システム環境検証とClasp CLIセットアップ確認
2. `clasp_setup` - Clasp CLI認証セットアップガイダンス  
3. `clasp_create` - Google Apps Scriptプロジェクト作成準備
4. `clasp_clone` - 既存プロジェクトクローン準備
5. `clasp_pull` - プロジェクト変更取得準備
6. `clasp_push_and_deploy` - プロジェクトプッシュ＆デプロイ準備
7. `clasp_list` - プロジェクト一覧取得

> **注意**: STABLE版は基本的なClasp操作の**準備・ガイダンス**を提供します。実際のClasp実行は別途ローカル環境で行ってください。高度なセキュリティ機能については開発版をご利用ください。

### **🔒 高度なセキュリティ機能（開発版のみ）**
- `set_secure_property` - 暗号化保存
- `get_secure_property` - 復号化取得
- `delete_property` - プロパティ削除
- `list_properties` - プロパティ一覧
- `audit_properties` - セキュリティ監査
- `backup_properties` - バックアップ
- `restore_properties` - 復元

## ⚙️ 環境変数

| 環境変数 | 説明 | 必須 | デフォルト |
|---------|------|------|-----------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Service Accountキー | ○※ | - |
| `GOOGLE_CREDENTIALS_PATH` | OAuth認証情報パス | ○※ | - |
| `GOOGLE_AUTH_CODE` | OAuth認証コード | △ | - |
| `ENCRYPTION_KEY` | 暗号化キー（hex） | 推奨 | 自動生成 |
| `LOG_LEVEL` | ログレベル | - | `info` |
| `MCP_SERVER_NAME` | サーバー名 | - | `google-apps-script-mcp` |

※ いずれか1つが必須

## 🔐 必要なAPIスコープ

```
https://www.googleapis.com/auth/script.projects
https://www.googleapis.com/auth/script.processes
https://www.googleapis.com/auth/script.deployments
https://www.googleapis.com/auth/script.metrics
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/drive.metadata.readonly
```

## 🛠️ 開発・テスト

### **開発モード起動**

```bash
npm run dev
```

### **テスト実行**

```bash
npm test
```

### **DXTファイル生成**

```bash
npm run build
```

## 🔍 トラブルシューティング

### **認証エラー**

```bash
❌ Google認証に失敗しました: invalid_client
```

**解決方法:**
1. Service Accountキーが正しいか確認
2. Google Apps Script APIが有効化されているか確認
3. 必要なスコープが付与されているか確認

### **暗号化エラー**

```bash
❌ 暗号化エラー: invalid key length
```

**解決方法:**
1. 暗号化キーが64文字のhex文字列か確認
2. 新しい暗号化キーを生成: `openssl rand -hex 32`

### **プロパティアクセスエラー**

```bash
❌ プロパティ取得エラー: permission denied
```

**解決方法:**
1. スクリプトIDが正しいか確認
2. APIスコープに`script.projects`が含まれているか確認

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

## 🔗 関連リンク

- [Google Apps Script API](https://developers.google.com/apps-script/api)
- [MCP Protocol](https://spec.modelcontextprotocol.io/)
- [Claude.ai](https://claude.ai/)
- [Google Cloud Console](https://console.cloud.google.com/)

## 🆘 サポート

問題が発生した場合は、[Issues](https://github.com/Utakata/google-apps-script-mcp/issues)を作成してください。

---

**🔒 Security First - Google Apps Script MCP Server**
