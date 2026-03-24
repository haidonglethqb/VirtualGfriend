import { Request, Response, NextFunction } from 'express';
import { telemetryService } from '../modules/monitoring/telemetry.service';

declare global {
  namespace Express {
    interface Request {
      requestStartNs?: bigint;
    }
  }
}

export function requestMonitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  req.requestStartNs = process.hrtime.bigint();

  let isRecorded = false;
  const recordRequest = () => {
    if (isRecorded) return;
    isRecorded = true;

    const durationNs = req.requestStartNs ? process.hrtime.bigint() - req.requestStartNs : BigInt(0);
    const durationMs = Number(durationNs / BigInt(1000000));

    void telemetryService.recordRequestEvent({
      requestId: req.requestId,
      userId: req.user?.id,
      userTier: req.user?.premiumTier,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  };

  res.on('finish', recordRequest);
  res.on('close', recordRequest);

  next();
}
