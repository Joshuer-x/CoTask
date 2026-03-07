import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./users";

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  hashedKey: text("hashed_key").notNull().unique(),
  name: text("name").notNull(),
  scopes: text("scopes").array().notNull().default([]),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
