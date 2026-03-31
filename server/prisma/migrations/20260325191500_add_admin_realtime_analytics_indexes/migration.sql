-- CreateIndex (admin realtime analytics)
-- These indexes may already exist; using IF NOT EXISTS for safety

CREATE INDEX IF NOT EXISTS "monitoring_events_event_type_idx" ON "monitoring_events"("eventType");
CREATE INDEX IF NOT EXISTS "monitoring_events_created_at_idx" ON "monitoring_events"("createdAt");
