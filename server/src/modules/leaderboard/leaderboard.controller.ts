import { Request, Response, NextFunction } from 'express'
import { leaderboardService } from './leaderboard.service'

export const leaderboardController = {
  async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const category = (req.query.category as string) || 'level'
      const limit = parseInt(req.query.limit as string) || 20
      const entries = await leaderboardService.getByCategory(category, limit)

      // Also get current user's rank
      const myRank = req.user?.id
        ? await leaderboardService.getUserRank(req.user.id, category)
        : null

      res.json({
        success: true,
        data: {
          category,
          entries,
          myRank,
        },
      })
    } catch (err) { next(err) }
  },
}
