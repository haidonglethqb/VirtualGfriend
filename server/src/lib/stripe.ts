import Stripe from 'stripe'
import { createModuleLogger } from './logger'

const log = createModuleLogger('Stripe')

if (!process.env.STRIPE_SECRET_KEY) {
  log.warn('STRIPE_SECRET_KEY not set — payment features disabled')
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export function getStripeOrThrow(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env')
  }
  return stripe
}
