CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"hashed_key" text NOT NULL,
	"name" text NOT NULL,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"created_by" uuid NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "api_keys_hashed_key_unique" UNIQUE("hashed_key")
);
--> statement-breakpoint
DROP INDEX IF EXISTS "tasks_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tasks_assignee_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tasks_status_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tasks_due_date_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "notifications_user_id_idx";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_workspace_status_idx" ON "tasks" ("workspace_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_workspace_assignee_idx" ON "tasks" ("workspace_id","assignee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_workspace_due_date_idx" ON "tasks" ("workspace_id","due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_workspace_created_at_idx" ON "tasks" ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_points_pending_idx" ON "action_points" ("meeting_id","accepted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_workspace_status_idx" ON "meetings" ("workspace_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_workspace_created_at_idx" ON "meetings" ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" ("user_id","read_at");