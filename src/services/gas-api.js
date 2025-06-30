/**
 * Google Apps Script API操作サービス
 * 
 * Google Apps Scriptの全ての操作を提供
 * - プロジェクト管理
 * - ファイル操作
 * - 実行・デプロイ
 * - トリガー管理
 * - ログ・監視
 * 
 * Author: UtaNote
 */

import { GoogleAuth } from '../auth/google-auth.js';
import dayjs from 'dayjs';
import _ from 'lodash';

export class GASApiService {
  constructor(googleAuth = null) {
    this.googleAuth = googleAuth || new GoogleAuth();
  }

  /**
   * APIクライアントを取得
   */
  getScriptApi() {
    return this.googleAuth.getScriptApi();
  }

  getDriveApi() {
    return this.googleAuth.getDriveApi();
  }

  // ===== プロジェクト管理 =====

  /**
   * 新しいGASプロジェクトを作成
   */
  async createProject(title, parentId = null) {
    try {
      const scriptApi = this.getScriptApi();
      
      const projectData = {
        title: title,
        parentId: parentId
      };

      console.log(`📝 プロジェクト「${title}」を作成中...`);
      
      const response = await scriptApi.projects.create({
        requestBody: projectData
      });

      const project = response.data;
      console.log(`✅ プロジェクト作成完了: ${project.scriptId}`);
      
      return {
        scriptId: project.scriptId,
        title: project.title,
        createTime: project.createTime,
        updateTime: project.updateTime,
        url: `https://script.google.com/d/${project.scriptId}/edit`
      };
      
    } catch (error) {
      console.error('❌ プロジェクト作成エラー:', error.message);
      throw new Error(`プロジェクト作成失敗: ${error.message}`);
    }
  }

  /**
   * GASプロジェクト一覧を取得
   */
  async listProjects(pageSize = 10, pageToken = null) {
    try {
      const driveApi = this.getDriveApi();
      
      console.log('📋 プロジェクト一覧を取得中...');
      
      const response = await driveApi.files.list({
        q: "mimeType='application/vnd.google-apps.script'",
        pageSize: pageSize,
        pageToken: pageToken,
        fields: 'nextPageToken, files(id, name, createdTime, modifiedTime, webViewLink)'
      });

      const files = response.data.files || [];
      
      // プロジェクト情報を整形
      const projects = files.map(file => ({
        scriptId: file.id,
        title: file.name,
        createTime: file.createdTime,
        updateTime: file.modifiedTime,
        url: file.webViewLink
      }));

      console.log(`✅ ${projects.length}件のプロジェクトを取得しました`);
      
      return {
        files: projects,
        nextPageToken: response.data.nextPageToken
      };
      
    } catch (error) {
      console.error('❌ プロジェクト一覧取得エラー:', error.message);
      throw new Error(`プロジェクト一覧取得失敗: ${error.message}`);
    }
  }

  /**
   * GASプロジェクトの詳細を取得
   */
  async getProject(scriptId, versionNumber = null) {
    try {
      const scriptApi = this.getScriptApi();
      
      console.log(`📄 プロジェクト詳細を取得中: ${scriptId}`);
      
      const params = { scriptId };
      if (versionNumber !== null) {
        params.versionNumber = versionNumber;
      }

      const response = await scriptApi.projects.getContent(params);
      const project = response.data;

      console.log(`✅ プロジェクト詳細を取得しました: ${project.title}`);
      
      return {
        scriptId: project.scriptId,
        title: project.title,
        createTime: project.createTime,
        updateTime: project.updateTime,
        files: project.files || [],
        functionSet: project.functionSet || {}
      };
      
    } catch (error) {
      console.error('❌ プロジェクト詳細取得エラー:', error.message);
      throw new Error(`プロジェクト詳細取得失敗: ${error.message}`);
    }
  }

  /**
   * GASプロジェクトを更新
   */
  async updateProject(scriptId, content) {
    try {
      const scriptApi = this.getScriptApi();
      
      console.log(`📝 プロジェクト更新中: ${scriptId}`);
      
      const response = await scriptApi.projects.updateContent({
        scriptId: scriptId,
        requestBody: content
      });

      const project = response.data;
      console.log(`✅ プロジェクト更新完了: ${project.title}`);
      
      return {
        scriptId: project.scriptId,
        title: project.title,
        updateTime: project.updateTime
      };
      
    } catch (error) {
      console.error('❌ プロジェクト更新エラー:', error.message);
      throw new Error(`プロジェクト更新失敗: ${error.message}`);
    }
  }

  // ===== ファイル操作 =====

  /**
   * GASファイルを作成
   */
  async createFile(scriptId, name, type, source) {
    try {
      // 既存プロジェクトを取得
      const project = await this.getProject(scriptId);
      
      // 新しいファイルを追加
      const newFile = {
        name: name,
        type: type,
        source: source
      };

      const updatedFiles = [...(project.files || []), newFile];
      
      const updatedContent = {
        scriptId: scriptId,
        files: updatedFiles
      };

      await this.updateProject(scriptId, updatedContent);
      
      console.log(`✅ ファイル「${name}」を作成しました`);
      
      return {
        name: name,
        type: type,
        source: source
      };
      
    } catch (error) {
      console.error('❌ ファイル作成エラー:', error.message);
      throw new Error(`ファイル作成失敗: ${error.message}`);
    }
  }

  /**
   * GASファイルの内容を取得
   */
  async getFile(scriptId, fileName) {
    try {
      const project = await this.getProject(scriptId);
      const file = project.files.find(f => f.name === fileName);
      
      if (!file) {
        throw new Error(`ファイル「${fileName}」が見つかりません`);
      }

      console.log(`✅ ファイル「${fileName}」を取得しました`);
      
      return {
        name: file.name,
        type: file.type,
        source: file.source
      };
      
    } catch (error) {
      console.error('❌ ファイル取得エラー:', error.message);
      throw new Error(`ファイル取得失敗: ${error.message}`);
    }
  }

  /**
   * GASファイルを更新
   */
  async updateFile(scriptId, fileName, source) {
    try {
      const project = await this.getProject(scriptId);
      
      const fileIndex = project.files.findIndex(f => f.name === fileName);
      if (fileIndex === -1) {
        throw new Error(`ファイル「${fileName}」が見つかりません`);
      }

      // ファイルを更新
      project.files[fileIndex].source = source;
      
      const updatedContent = {
        scriptId: scriptId,
        files: project.files
      };

      await this.updateProject(scriptId, updatedContent);
      
      console.log(`✅ ファイル「${fileName}」を更新しました`);
      
      return {
        name: fileName,
        source: source,
        updateTime: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ ファイル更新エラー:', error.message);
      throw new Error(`ファイル更新失敗: ${error.message}`);
    }
  }

  /**
   * GASファイルを削除
   */
  async deleteFile(scriptId, fileName) {
    try {
      const project = await this.getProject(scriptId);
      
      const updatedFiles = project.files.filter(f => f.name !== fileName);
      
      if (updatedFiles.length === project.files.length) {
        throw new Error(`ファイル「${fileName}」が見つかりません`);
      }

      const updatedContent = {
        scriptId: scriptId,
        files: updatedFiles
      };

      await this.updateProject(scriptId, updatedContent);
      
      console.log(`✅ ファイル「${fileName}」を削除しました`);
      
      return {
        deleted: fileName,
        remainingFiles: updatedFiles.length
      };
      
    } catch (error) {
      console.error('❌ ファイル削除エラー:', error.message);
      throw new Error(`ファイル削除失敗: ${error.message}`);
    }
  }

  // ===== 実行・デプロイ =====

  /**
   * GAS関数を実行
   */
  async executeFunction(scriptId, functionName, parameters = [], devMode = false) {
    try {
      const scriptApi = this.getScriptApi();
      
      console.log(`🚀 関数実行中: ${functionName}`);
      
      const requestBody = {
        function: functionName,
        parameters: parameters,
        devMode: devMode
      };

      const response = await scriptApi.scripts.run({
        scriptId: scriptId,
        requestBody: requestBody
      });

      const result = response.data;
      
      if (result.error) {
        console.error(`❌ 実行エラー:`, result.error);
        return {
          error: result.error,
          function: functionName,
          parameters: parameters
        };
      }

      console.log(`✅ 関数実行完了: ${functionName}`);
      
      return {
        response: result.response,
        function: functionName,
        parameters: parameters,
        executionTime: dayjs().toISOString()
      };
      
    } catch (error) {
      console.error('❌ 関数実行エラー:', error.message);
      throw new Error(`関数実行失敗: ${error.message}`);
    }
  }

  /**
   * Webアプリとしてデプロイ
   */
  async deployWebApp(scriptId, versionNumber = null, manifestFileName = 'appsscript', description = '') {
    try {
      const scriptApi = this.getScriptApi();
      
      console.log(`🚀 Webアプリデプロイ中: ${scriptId}`);
      
      const deploymentConfig = {
        versionNumber: versionNumber,
        manifestFileName: manifestFileName,
        description: description
      };

      const response = await scriptApi.projects.deployments.create({
        scriptId: scriptId,
        requestBody: deploymentConfig
      });

      const deployment = response.data;
      console.log(`✅ Webアプリデプロイ完了: ${deployment.deploymentId}`);
      
      return {
        deploymentId: deployment.deploymentId,
        entryPoints: deployment.entryPoints,
        updateTime: deployment.updateTime,
        description: description
      };
      
    } catch (error) {
      console.error('❌ Webアプリデプロイエラー:', error.message);
      throw new Error(`Webアプリデプロイ失敗: ${error.message}`);
    }
  }

  /**
   * デプロイメント一覧を取得
   */
  async listDeployments(scriptId) {
    try {
      const scriptApi = this.getScriptApi();
      
      console.log(`📋 デプロイメント一覧取得中: ${scriptId}`);
      
      const response = await scriptApi.projects.deployments.list({
        scriptId: scriptId
      });

      const deployments = response.data.deployments || [];
      console.log(`✅ ${deployments.length}件のデプロイメントを取得しました`);
      
      return {
        deployments: deployments
      };
      
    } catch (error) {
      console.error('❌ デプロイメント一覧取得エラー:', error.message);
      throw new Error(`デプロイメント一覧取得失敗: ${error.message}`);
    }
  }

  // ===== トリガー管理 =====

  /**
   * トリガーを管理
   */
  async manageTriggers(scriptId, action, triggerConfig = null, triggerId = null) {
    try {
      const scriptApi = this.getScriptApi();
      
      switch (action) {
        case 'list':
          return await this.listTriggers(scriptId);
        case 'create':
          return await this.createTrigger(scriptId, triggerConfig);
        case 'delete':
          return await this.deleteTrigger(scriptId, triggerId);
        default:
          throw new Error(`未知のアクション: ${action}`);
      }
      
    } catch (error) {
      console.error('❌ トリガー管理エラー:', error.message);
      throw new Error(`トリガー管理失敗: ${error.message}`);
    }
  }

  /**
   * トリガー一覧を取得
   */
  async listTriggers(scriptId) {
    try {
      const scriptApi = this.getScriptApi();
      
      console.log(`⚡ トリガー一覧取得中: ${scriptId}`);
      
      const response = await scriptApi.projects.triggers.list({
        scriptId: scriptId
      });

      const triggers = response.data.triggers || [];
      console.log(`✅ ${triggers.length}件のトリガーを取得しました`);
      
      return {
        triggers: triggers
      };
      
    } catch (error) {
      console.error('❌ トリガー一覧取得エラー:', error.message);
      throw new Error(`トリガー一覧取得失敗: ${error.message}`);
    }
  }

  /**
   * トリガーを作成
   */
  async createTrigger(scriptId, triggerConfig) {
    try {
      const scriptApi = this.getScriptApi();
      
      console.log(`⚡ トリガー作成中: ${triggerConfig.handlerFunction}`);
      
      const response = await scriptApi.projects.triggers.create({
        scriptId: scriptId,
        requestBody: triggerConfig
      });

      const trigger = response.data;
      console.log(`✅ トリガー作成完了: ${trigger.triggerId}`);
      
      return {
        triggerId: trigger.triggerId,
        handlerFunction: trigger.handlerFunction,
        eventType: trigger.eventType,
        createTime: trigger.createTime
      };
      
    } catch (error) {
      console.error('❌ トリガー作成エラー:', error.message);
      throw new Error(`トリガー作成失敗: ${error.message}`);
    }
  }

  /**
   * トリガーを削除
   */
  async deleteTrigger(scriptId, triggerId) {
    try {
      const scriptApi = this.getScriptApi();
      
      console.log(`⚡ トリガー削除中: ${triggerId}`);
      
      await scriptApi.projects.triggers.delete({
        scriptId: scriptId,
        triggerId: triggerId
      });

      console.log(`✅ トリガー削除完了: ${triggerId}`);
      
      return {
        deleted: triggerId,
        deleteTime: dayjs().toISOString()
      };
      
    } catch (error) {
      console.error('❌ トリガー削除エラー:', error.message);
      throw new Error(`トリガー削除失敗: ${error.message}`);
    }
  }

  // ===== ログ・監視 =====

  /**
   * 実行ログを取得
   */
  async getLogs(scriptId, pageSize = 100, pageToken = null, filter = null) {
    try {
      const scriptApi = this.getScriptApi();
      
      console.log(`📊 実行ログ取得中: ${scriptId}`);
      
      const params = {
        scriptId: scriptId,
        pageSize: pageSize
      };

      if (pageToken) params.pageToken = pageToken;
      if (filter) params.filter = filter;

      const response = await scriptApi.processes.list(params);
      const executions = response.data.processes || [];
      
      console.log(`✅ ${executions.length}件のログを取得しました`);
      
      return {
        executions: executions,
        nextPageToken: response.data.nextPageToken
      };
      
    } catch (error) {
      console.error('❌ ログ取得エラー:', error.message);
      throw new Error(`ログ取得失敗: ${error.message}`);
    }
  }

  /**
   * プロジェクトメトリクスを取得
   */
  async getMetrics(scriptId, filter = null) {
    try {
      const scriptApi = this.getScriptApi();
      
      console.log(`📈 メトリクス取得中: ${scriptId}`);
      
      const params = { scriptId };
      if (filter) params.filter = filter;

      const response = await scriptApi.projects.getMetrics(params);
      const metrics = response.data;
      
      console.log(`✅ メトリクスを取得しました`);
      
      return metrics;
      
    } catch (error) {
      console.error('❌ メトリクス取得エラー:', error.message);
      throw new Error(`メトリクス取得失敗: ${error.message}`);
    }
  }

  // ===== ライブラリ管理 =====

  /**
   * ライブラリを管理
   */
  async manageLibraries(scriptId, action, libraryId = null, version = null, identifier = null) {
    try {
      switch (action) {
        case 'list':
          return await this.listLibraries(scriptId);
        case 'add':
          return await this.addLibrary(scriptId, libraryId, version, identifier);
        case 'remove':
          return await this.removeLibrary(scriptId, libraryId);
        case 'update':
          return await this.updateLibrary(scriptId, libraryId, version);
        default:
          throw new Error(`未知のアクション: ${action}`);
      }
      
    } catch (error) {
      console.error('❌ ライブラリ管理エラー:', error.message);
      throw new Error(`ライブラリ管理失敗: ${error.message}`);
    }
  }

  /**
   * ライブラリ一覧を取得
   */
  async listLibraries(scriptId) {
    try {
      const project = await this.getProject(scriptId);
      
      // マニフェストファイルからライブラリ情報を取得
      const manifestFile = project.files.find(f => f.name === 'appsscript');
      if (!manifestFile) {
        return { libraries: [] };
      }

      const manifest = JSON.parse(manifestFile.source);
      const libraries = manifest.dependencies?.libraries || [];
      
      console.log(`📚 ${libraries.length}件のライブラリを取得しました`);
      
      return {
        libraries: libraries
      };
      
    } catch (error) {
      console.error('❌ ライブラリ一覧取得エラー:', error.message);
      throw new Error(`ライブラリ一覧取得失敗: ${error.message}`);
    }
  }

  /**
   * ライブラリを追加
   */
  async addLibrary(scriptId, libraryId, version, identifier) {
    try {
      const project = await this.getProject(scriptId);
      
      // マニフェストファイルを取得
      const manifestFile = project.files.find(f => f.name === 'appsscript');
      if (!manifestFile) {
        throw new Error('マニフェストファイルが見つかりません');
      }

      const manifest = JSON.parse(manifestFile.source);
      
      // ライブラリを追加
      if (!manifest.dependencies) manifest.dependencies = {};
      if (!manifest.dependencies.libraries) manifest.dependencies.libraries = [];

      const newLibrary = {
        userSymbol: identifier,
        libraryId: libraryId,
        version: version
      };

      manifest.dependencies.libraries.push(newLibrary);
      
      // マニフェストファイルを更新
      await this.updateFile(scriptId, 'appsscript', JSON.stringify(manifest, null, 2));
      
      console.log(`✅ ライブラリ「${identifier}」を追加しました`);
      
      return {
        added: identifier,
        libraryId: libraryId,
        version: version
      };
      
    } catch (error) {
      console.error('❌ ライブラリ追加エラー:', error.message);
      throw new Error(`ライブラリ追加失敗: ${error.message}`);
    }
  }

  /**
   * ライブラリを削除
   */
  async removeLibrary(scriptId, libraryId) {
    try {
      const project = await this.getProject(scriptId);
      
      // マニフェストファイルを取得
      const manifestFile = project.files.find(f => f.name === 'appsscript');
      if (!manifestFile) {
        throw new Error('マニフェストファイルが見つかりません');
      }

      const manifest = JSON.parse(manifestFile.source);
      
      if (!manifest.dependencies?.libraries) {
        throw new Error('ライブラリが設定されていません');
      }

      // ライブラリを削除
      const originalCount = manifest.dependencies.libraries.length;
      manifest.dependencies.libraries = manifest.dependencies.libraries.filter(
        lib => lib.libraryId !== libraryId
      );

      if (manifest.dependencies.libraries.length === originalCount) {
        throw new Error(`ライブラリ「${libraryId}」が見つかりません`);
      }

      // マニフェストファイルを更新
      await this.updateFile(scriptId, 'appsscript', JSON.stringify(manifest, null, 2));
      
      console.log(`✅ ライブラリ「${libraryId}」を削除しました`);
      
      return {
        removed: libraryId,
        remainingLibraries: manifest.dependencies.libraries.length
      };
      
    } catch (error) {
      console.error('❌ ライブラリ削除エラー:', error.message);
      throw new Error(`ライブラリ削除失敗: ${error.message}`);
    }
  }

  /**
   * ライブラリを更新
   */
  async updateLibrary(scriptId, libraryId, newVersion) {
    try {
      const project = await this.getProject(scriptId);
      
      // マニフェストファイルを取得
      const manifestFile = project.files.find(f => f.name === 'appsscript');
      if (!manifestFile) {
        throw new Error('マニフェストファイルが見つかりません');
      }

      const manifest = JSON.parse(manifestFile.source);
      
      if (!manifest.dependencies?.libraries) {
        throw new Error('ライブラリが設定されていません');
      }

      // ライブラリを更新
      const library = manifest.dependencies.libraries.find(lib => lib.libraryId === libraryId);
      if (!library) {
        throw new Error(`ライブラリ「${libraryId}」が見つかりません`);
      }

      const oldVersion = library.version;
      library.version = newVersion;

      // マニフェストファイルを更新
      await this.updateFile(scriptId, 'appsscript', JSON.stringify(manifest, null, 2));
      
      console.log(`✅ ライブラリ「${library.userSymbol}」を${oldVersion}から${newVersion}に更新しました`);
      
      return {
        updated: library.userSymbol,
        libraryId: libraryId,
        oldVersion: oldVersion,
        newVersion: newVersion
      };
      
    } catch (error) {
      console.error('❌ ライブラリ更新エラー:', error.message);
      throw new Error(`ライブラリ更新失敗: ${error.message}`);
    }
  }

  // ===== ユーティリティ =====

  /**
   * プロジェクトの統計情報を取得
   */
  async getProjectStats(scriptId) {
    try {
      const project = await this.getProject(scriptId);
      const triggers = await this.listTriggers(scriptId);
      const deployments = await this.listDeployments(scriptId);
      const libraries = await this.listLibraries(scriptId);

      const stats = {
        projectInfo: {
          scriptId: project.scriptId,
          title: project.title,
          createTime: project.createTime,
          updateTime: project.updateTime
        },
        files: {
          total: project.files.length,
          types: _.countBy(project.files, 'type'),
          totalLines: project.files.reduce((sum, file) => 
            sum + (file.source ? file.source.split('\n').length : 0), 0
          )
        },
        triggers: {
          total: triggers.triggers.length,
          types: _.countBy(triggers.triggers, 'eventType')
        },
        deployments: {
          total: deployments.deployments.length
        },
        libraries: {
          total: libraries.libraries.length
        }
      };

      console.log(`📊 プロジェクト統計情報を取得しました: ${project.title}`);
      
      return stats;
      
    } catch (error) {
      console.error('❌ プロジェクト統計取得エラー:', error.message);
      throw new Error(`プロジェクト統計取得失敗: ${error.message}`);
    }
  }

  /**
   * プロジェクトをバックアップ
   */
  async backupProject(scriptId) {
    try {
      const project = await this.getProject(scriptId);
      const triggers = await this.listTriggers(scriptId);
      const deployments = await this.listDeployments(scriptId);
      const libraries = await this.listLibraries(scriptId);

      const backup = {
        timestamp: dayjs().toISOString(),
        project: project,
        triggers: triggers.triggers,
        deployments: deployments.deployments,
        libraries: libraries.libraries
      };

      console.log(`💾 プロジェクト「${project.title}」をバックアップしました`);
      
      return backup;
      
    } catch (error) {
      console.error('❌ プロジェクトバックアップエラー:', error.message);
      throw new Error(`プロジェクトバックアップ失敗: ${error.message}`);
    }
  }
}
