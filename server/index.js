import { createApp } from './src/app.js'
import { env } from './src/config/env.js'
import { logger } from './src/config/logger.js'
import { assertDatabaseConnection, closePool } from './src/config/database.js'
import { startJobs, stopJobs } from './src/services/jobs.service.js'

async function main() {
  // Fail fast if MySQL is unreachable, rather than 500ing every request.
  await assertDatabaseConnection()

  const app = createApp()
  const server = app.listen(env.port, '0.0.0.0', () => {
    logger.info(
      { port: env.port, env: env.nodeEnv, pid: process.pid },
      `Kick API listening on http://localhost:${env.port}`
    )
  })

  // Slightly above a typical 60s load-balancer idle timeout, so the LB closes
  // connections first and clients never see a truncated response.
  server.keepAliveTimeout = 65_000
  server.headersTimeout = 66_000

  startJobs()

  /**
   * Graceful shutdown: stop accepting new connections, let in-flight requests
   * finish, then close the pool. Without this a deploy can kill a request
   * mid-transaction.
   */
  let shuttingDown = false
  async function shutdown(signal) {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, 'shutting down')

    stopJobs()

    const force = setTimeout(() => {
      logger.error('forced exit after 15s')
      process.exit(1)
    }, 15_000)
    force.unref()

    server.close(async () => {
      try {
        await closePool()
        logger.info('shutdown complete')
        process.exit(0)
      } catch (err) {
        logger.error({ err }, 'error during shutdown')
        process.exit(1)
      }
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandled promise rejection')
  })

  // An uncaught exception leaves the process in an unknown state — log it and
  // restart rather than serving corrupt responses.
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught exception — exiting')
    shutdown('uncaughtException')
  })
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start')
  process.exit(1)
})
