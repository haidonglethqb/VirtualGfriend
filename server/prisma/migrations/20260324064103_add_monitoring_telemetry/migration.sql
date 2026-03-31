-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "MonitoringEventType" AS ENUM ('REQUEST', 'ERROR', 'AUTH', 'SOCKET', 'JOB', 'SECURITY', 'BUSINESS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "monitoring_events" (
    "id" TEXT NOT NULL,
    "eventType" "MonitoringEventType" NOT NULL,
    "metricKey" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "source" TEXT NOT NULL DEFAULT 'api',
    "requestId" TEXT,
    "userId" TEXT,
    "userTier" "PremiumTier",
    "path" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "durationMs" INTEGER,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "monitoring_metric_rollups" (
    "id" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "bucketSize" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "dimensions" JSONB,
    "dimensionsHash" TEXT NOT NULL DEFAULT 'global',
    "count" INTEGER NOT NULL DEFAULT 0,
    "sumValue" DOUBLE PRECISION,
    "avgValue" DOUBLE PRECISION,
    "p95Value" DOUBLE PRECISION,
    "p99Value" DOUBLE PRECISION,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_metric_rollups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "monitoring_events_eventType_createdAt_idx" ON "monitoring_events"("eventType", "createdAt");

CREATE INDEX IF NOT EXISTS "monitoring_events_metricKey_createdAt_idx" ON "monitoring_events"("metricKey", "createdAt");

CREATE INDEX IF NOT EXISTS "monitoring_events_path_method_createdAt_idx" ON "monitoring_events"("path", "method", "createdAt");

CREATE INDEX IF NOT EXISTS "monitoring_events_statusCode_createdAt_idx" ON "monitoring_events"("statusCode", "createdAt");

CREATE INDEX IF NOT EXISTS "monitoring_events_userId_createdAt_idx" ON "monitoring_events"("userId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "monitoring_metric_rollups_bucketStart_bucketSize_metricKey_d_key" ON "monitoring_metric_rollups"("bucketStart", "bucketSize", "metricKey", "dimensionsHash");

CREATE INDEX IF NOT EXISTS "monitoring_metric_rollups_bucketStart_bucketSize_idx" ON "monitoring_metric_rollups"("bucketStart", "bucketSize");

CREATE INDEX IF NOT EXISTS "monitoring_metric_rollups_metricKey_bucketStart_idx" ON "monitoring_metric_rollups"("metricKey", "bucketStart");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "monitoring_events" ADD CONSTRAINT "monitoring_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
