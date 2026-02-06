/**
 * Structured Logger
 * Replaces raw console.log with leveled, tagged logging.
 * Set LOG_LEVEL env var: debug | info | warn | error
 * Production defaults to 'info', dev defaults to 'debug'.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function timestamp(): string {
  return new Date().toISOString()
}

function createLogger(tag?: string) {
  const prefix = tag ? `[${tag}]` : ''

  return {
    debug(message: string, data?: unknown) {
      if (!shouldLog('debug')) return
      if (data !== undefined) {
        console.debug(`${timestamp()} DEBUG ${prefix} ${message}`, data)
      } else {
        console.debug(`${timestamp()} DEBUG ${prefix} ${message}`)
      }
    },

    info(message: string, data?: unknown) {
      if (!shouldLog('info')) return
      if (data !== undefined) {
        console.log(`${timestamp()} INFO  ${prefix} ${message}`, data)
      } else {
        console.log(`${timestamp()} INFO  ${prefix} ${message}`)
      }
    },

    warn(message: string, data?: unknown) {
      if (!shouldLog('warn')) return
      if (data !== undefined) {
        console.warn(`${timestamp()} WARN  ${prefix} ${message}`, data)
      } else {
        console.warn(`${timestamp()} WARN  ${prefix} ${message}`)
      }
    },

    error(message: string, data?: unknown) {
      if (!shouldLog('error')) return
      if (data !== undefined) {
        console.error(`${timestamp()} ERROR ${prefix} ${message}`, data)
      } else {
        console.error(`${timestamp()} ERROR ${prefix} ${message}`)
      }
    },
  }
}

export const logger = createLogger()

export function createModuleLogger(module: string) {
  return createLogger(module)
}
