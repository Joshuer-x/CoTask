import { pgTable, text, uuid, timestamp, smallint, date, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("todo"),
    priority: smallint("priority").notNull().default(3),
    assigneeId: uuid("assignee_id").references(() => users.id),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id),
    dueDate: date("due_date"),
    source: text("source").notNull().default("manual"),
    meetingId: uuid("meeting_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    // Composite indexes matching architecture query patterns
    workspaceStatusIdx: index("tasks_workspace_status_idx").on(t.workspaceId, t.status),
    workspaceAssigneeIdx: index("tasks_workspace_assignee_idx").on(t.workspaceId, t.assigneeId),
    workspaceDueDateIdx: index("tasks_workspace_due_date_idx").on(t.workspaceId, t.dueDate),
    workspaceCreatedAtIdx: index("tasks_workspace_created_at_idx").on(t.workspaceId, t.createdAt),
  }),
);

export const taskComments = pgTable("task_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  parentCommentId: uuid("parent_comment_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskActivityLog = pgTable("task_activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  eventType: text("event_type").notNull(),
  oldVal: text("old_val"),
  newVal: text("new_val"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskLinks = pgTable("task_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceTaskId: uuid("source_task_id")
    .notNull()
    .references(() => tasks.id),
  targetTaskId: uuid("target_task_id")
    .notNull()
    .references(() => tasks.id),
  linkType: text("link_type").notNull(),
});

export const taskAttachments = pgTable("task_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id),
  s3Key: text("s3_key").notNull(),
  filename: text("filename").notNull(),
  sizeBytes: smallint("size_bytes").notNull(),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
