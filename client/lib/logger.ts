import pino, { type Logger } from 'pino'
import type PinoPretty from 'pino-pretty'

const isDev = process.env.NODE_ENV !== 'production'
const isServer = typeof window === 'undefined'

/**
 * Base pino logger instance.
 *
 * - Server: JSON出力。開発時は pino-pretty でカラーフォーマット（ストリーム経由）。
 * - Browser: pino のブラウザモード（console.* へマッピング）。
 * - ログレベル: NODE_ENV=production → 'info', それ以外 → 'debug'
 *
 * NOTE: `transport: { target: 'pino-pretty' }` は thread-stream でワーカースレッドを
 * 起動するため、Next.js (Turbopack) 環境では __dirname が /ROOT に書き換えられ
 * worker.js が見つからないエラーが発生する。
 * pino-pretty を直接ストリームとして渡すことでワーカースレッドを回避する。
 */
function buildBaseLogger(): Logger {
  if (!isServer) {
    return pino({
      level: isDev ? 'debug' : 'info',
      browser: { asObject: false },
    })
  }

  if (isDev) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pretty = require('pino-pretty') as typeof PinoPretty
    const stream = pretty({
      colorize: true,
      translateTime: 'SYS:HH:MM:ss.l',
      ignore: 'pid,hostname',
      sync: true,
    })
    return pino({ level: 'debug' }, stream)
  }

  return pino({ level: 'info' })
}

const baseLogger: Logger = buildBaseLogger()

/**
 * 名前付き子ロガーを生成する。
 *
 * @param name - ログの `name` フィールドに付与するモジュール識別子
 * @returns pino Logger（child）
 *
 * @example
 * const logger = createLogger('api:github/issues')
 * logger.info({ issueCount: 5 }, 'Issues loaded')
 */
export function createLogger(name: string): Logger {
  return baseLogger.child({ name })
}
