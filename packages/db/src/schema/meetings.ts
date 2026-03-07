import { pgTable, text, uuid, timestamp, integer, real, boolean, date, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";
import { tasks } from "./tasks";

export const meetings = pgTable(
  "meetings",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  title: text("title").notNull(),
  platform: text("platform").notNull(),
  externalMeetingId: text("external_meeting_id").notNull(),
  botJoinUrl: text("bot_join_url").notNull(),
  status: text("status").notNull().default("scheduled"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceStatusIdx: index("meetings_workspace_status_idx").on(t.workspaceId, t.status),
    workspaceCreatedAtIdx: index("meetings_workspace_created_at_idx").on(t.workspaceId, t.createdAt),
  }),
);

export const meetingParticipants = pgTable(
  "meeting_participants",
  {
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    speakerLabel: text("speaker_label"),
  },
);

export const actionPoints = pgTable(
  "action_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id),
    taskId: uuid("task_id").references(() => tasks.id),
    rawText: text("raw_text").notNull(),
    normalizedText: text("normalized_text").notNull(),
    inferredAssigneeId: uuid("inferred_assignee_id").references(() => users.id),
    inferenceReason: text("inference_reason").notNull(),
    confidence: real("confidence").notNull(),
    dueDateHint: date("due_date_hint"),
    accepted: boolean("accepted"),
    acceptedBy: uuid("accepted_by").references(() => users.id),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (t) => ({
    meetingIdx: index("action_points_meeting_id_idx").on(t.meetingId),
    pendingIdx: index("action_points_pending_idx").on(t.meetingId, t.accepted),
  }),
);
