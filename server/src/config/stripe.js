import Stripe from 'stripe';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Stripe client.
 *
 * `null` when STRIPE_SECRET_KEY is unset so the app still boots for local
 * development and tests. Payment routes check `env.stripe.enabled` and return
 * a clean 503 rather than crashing.
 */
export const stripe = env.stripe.enabled
  ? new Stripe(env.stripe.secretKey, {
      // Pin the version — never inherit a dashboard change mid-deploy.
      apiVersion: '2024-06-20',
      maxNetworkRetries: 2,
      timeout: 20_000,
    })
  : null;

if (!env.stripe.enabled) {
  logger.warn('STRIPE_SECRET_KEY not set — payment endpoints are disabled');
}
