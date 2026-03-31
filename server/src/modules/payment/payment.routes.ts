import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import {
  createCheckout,
  getStatus,
  cancelSub,
  getPricing,
} from './payment.controller'

export const paymentRouter = Router()

// Public — pricing info (no auth needed)
paymentRouter.get('/pricing', getPricing)

// Protected — require authentication
paymentRouter.post('/create-checkout', authenticate, createCheckout)
paymentRouter.get('/status', authenticate, getStatus)
paymentRouter.post('/cancel', authenticate, cancelSub)

// Note: webhook route is mounted separately in index.ts (needs raw body)
