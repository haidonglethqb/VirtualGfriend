-- NOTE:
-- Prisma migrate runs SQL in a transaction for PostgreSQL, so this file cannot
-- use CREATE INDEX CONCURRENTLY. To reduce production lock impact, pre-create
-- these indexes in a maintenance step with CONCURRENTLY before deploy.

DO $$
BEGIN
	IF to_regclass('public.users') IS NOT NULL THEN
		CREATE INDEX IF NOT EXISTS "users_createdAt_idx" ON "users"("createdAt");
		CREATE INDEX IF NOT EXISTS "users_lastActiveAt_idx" ON "users"("lastActiveAt");
		CREATE INDEX IF NOT EXISTS "users_premiumTier_createdAt_idx" ON "users"("premiumTier", "createdAt");
		CREATE INDEX IF NOT EXISTS "users_isEmailVerified_createdAt_idx" ON "users"("isEmailVerified", "createdAt");
	END IF;

	IF to_regclass('public.messages') IS NOT NULL THEN
		CREATE INDEX IF NOT EXISTS "messages_createdAt_role_userId_idx" ON "messages"("createdAt", "role", "userId");
	END IF;

	IF to_regclass('public.notifications') IS NOT NULL THEN
		CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("createdAt");
	END IF;

	IF to_regclass('public.monitoring_events') IS NOT NULL THEN
		CREATE INDEX IF NOT EXISTS "monitoring_events_createdAt_idx" ON "monitoring_events"("createdAt");
		CREATE INDEX IF NOT EXISTS "monitoring_events_eventType_createdAt_path_method_idx" ON "monitoring_events"("eventType", "createdAt", "path", "method");
	END IF;
END $$;
