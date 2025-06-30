/**
 * ロガーユーティリティ
 * 
 * カラー出力とログレベル管理
 * 
 * Author: UtaNote
 */

import chalk from 'chalk';
import dayjs from 'dayjs';

// Chalkインスタンスをエクスポート
export { chalk };

export class Logger {
  constructor(prefix = 'GAS-MCP') {
    this.prefix = prefix;
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  /**
   * ログレベルの設定
   */
  setLogLevel(level) {
    this.logLevel = level;
  }

  /**
   * タイムスタンプ付きメッセージの生成
   */
  formatMessage(level, message) {
    const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
    return `[${timestamp}] [${this.prefix}] [${level.toUpperCase()}] ${message}`;
  }

  /**
   * デバッグログ
   */
  debug(message) {
    if (['debug'].includes(this.logLevel)) {
      console.log(chalk.gray(this.formatMessage('debug', message)));
    }
  }

  /**
   * 情報ログ
   */
  info(message) {
    if (['debug', 'info'].includes(this.logLevel)) {
      console.log(chalk.blue(this.formatMessage('info', message)));
    }
  }

  /**
   * 成功ログ
   */
  success(message) {
    if (['debug', 'info', 'warn'].includes(this.logLevel)) {
      console.log(chalk.green(this.formatMessage('success', message)));
    }
  }

  /**
   * 警告ログ
   */
  warn(message) {
    if (['debug', 'info', 'warn'].includes(this.logLevel)) {
      console.warn(chalk.yellow(this.formatMessage('warn', message)));
    }
  }

  /**
   * エラーログ
   */
  error(message) {
    console.error(chalk.red(this.formatMessage('error', message)));
  }

  /**
   * 重要なメッセージ
   */
  important(message) {
    console.log(chalk.magenta.bold(this.formatMessage('important', message)));
  }
}

// デフォルトロガーインスタンス
export const logger = new Logger();
