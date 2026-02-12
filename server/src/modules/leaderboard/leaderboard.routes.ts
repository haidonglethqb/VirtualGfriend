import { Router } from 'express'
import { leaderboardController } from './leaderboard.controller'
import { authenticate } from '../../middlewares/auth.middleware'

export const leaderboardRouter = Router()

leaderboardRouter.use(authenticate)

leaderboardRouter.get('/', leaderboardController.getLeaderboard)
