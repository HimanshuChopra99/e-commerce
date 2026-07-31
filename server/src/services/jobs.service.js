import { logger } from '../config/logger.js'
import { env } from '../config/env.js'
import * as orderService from './order.service.js'
import * as tokenModel from '../models/auth-token.model.js'
import * as eventModel from '../models/stripe-event.model.js'

/**
 * Background maintenance, run with setInterval inside the process.
 *
 * At larger scale move these to a dedicated worker or a cron container so
 * several web instances don't duplicate the work.
 */

const MINUTE = 60 * 1000
const timers = []

/** Frees stock held by checkouts that were never paid. */
async function releaseStaleReservations() {
  try {
    const released = await orderService.releaseStaleReservations()
    if (released > 0) logger.info({ released }, 'released stale reservations')
  } catch (err) {
    logger.error({ err }, 'releaseStaleReservations failed')
  }
}

/** Keeps auth_tokens from growing without bound. */
async function purgeExpiredTokens() {
  try {
    const deleted = await tokenModel.purgeExpired()
    if (deleted > 0) logger.info({ deleted }, 'purged expired auth tokens')
  } catch (err) {
    logger.error({ err }, 'purgeExpiredTokens failed')
  }
}

/**
 * Surfaces webhooks that errored. These may be orders where money was taken
 * but fulfilment failed — the single most important thing to be alerted on.
 */
async function alertFailedWebhooks() {
  try {
    const count = await eventModel.countFailed()
    if (count > 0) {
      const failed = await eventModel.findFailed(10)
      logger.error(
        { count, examples: failed.map((f) => ({ id: f.event_id, type: f.type })) },
        'FAILED STRIPE WEBHOOKS need attention'
      )
    }
  } catch (err) {
    logger.error({ err }, 'alertFailedWebhooks failed')
  }
}

export function startJobs() {
  if (env.isTest) return

  timers.push(setInterval(releaseStaleReservations, 15 * MINUTE))
  timers.push(setInterval(purgeExpiredTokens, 24 * 60 * MINUTE))
  timers.push(setInterval(alertFailedWebhooks, 10 * MINUTE))

  // Don't hold the event loop open at shutdown.
  timers.forEach((t) => t.unref?.())

  // Run once shortly after boot to clean up anything left by a restart.
  setTimeout(releaseStaleReservations, 30_000).unref?.()

  logger.info({ jobs: timers.length }, 'background jobs scheduled')
}

export function stopJobs() {
  timers.forEach(clearInterval)
  timers.length = 0
}
