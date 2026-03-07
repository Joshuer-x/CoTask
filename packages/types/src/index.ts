// ─── Enums ────────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done" | "cancelled";
export type TaskPriority = 1 | 2 | 3 | 4;
export type TaskSource = "manual" | "ai_meeting";
export type WorkspaceRole = "admin" | "member" | "guest";
export type MeetingPlatform = "zoom" | "google_meet" | "teams";
export type MeetingStatus = "scheduled" | "active" | "processing" | "completed" | "failed";
export type InferenceReason = "explicit_name" | "first_person" | "role_match" | "unresolved";
export type ConfidenceLabel = "low" | "medium" | "high";

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  authProvider: "email" | "google" | "microsoft";
  createdAt: string;
  lastActiveAt: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  createdAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: Pick<User, "id" | "email" | "displayName" | "avatarUrl">;
}

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  creatorId: string;
  dueDate: string | null;
  source: TaskSource;
  meetingId: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: Pick<User, "id" | "displayName" | "avatarUrl"> | null;
  creator?: Pick<User, "id" | "displayName" | "avatarUrl">;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  parentCommentId: string | null;
  createdAt: string;
  author: Pick<User, "id" | "displayName" | "avatarUrl">;
}

export interface TaskLink {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  linkType: "blocks" | "blocked_by" | "duplicates" | "relates_to";
}

export interface Meeting {
  id: string;
  workspaceId: string;
  title: string;
  platform: MeetingPlatform;
  externalMeetingId: string;
  botJoinUrl: string;
  status: MeetingStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  createdBy: string;
  createdAt: string;
}

export interface ActionPoint {
  id: string;
  meetingId: string;
  taskId: string | null;
  rawText: string;
  normalizedText: string;
  inferredAssigneeId: string | null;
  inferenceReason: InferenceReason;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  dueDateHint: string | null;
  accepted: boolean | null;
  acceptedBy: string | null;
  acceptedAt: string | null;
  inferredAssignee?: Pick<User, "id" | "displayName" | "avatarUrl"> | null;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  actorId: string;
  eventType: string;
  oldVal: string | null;
  newVal: string | null;
  createdAt: string;
  actor: Pick<User, "id" | "displayName" | "avatarUrl">;
}

export interface TaskDetail extends Task {
  comments: TaskComment[];
  activity: TaskActivity[];
}

export interface Notification {
  id: string;
  userId: string;
  type: "task_assigned" | "meeting_complete" | "action_points_ready" | "task_commented";
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

// ─── API Request / Response shapes ───────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    nextCursor: string | null;
    total?: number;
  };
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export interface WsEvents {
  "task:created": { task: Task };
  "task:updated": { taskId: string; changes: Partial<Task> };
  "task:deleted": { taskId: string };
  "meeting:status": { meetingId: string; status: MeetingStatus };
  "action_points:ready": { meetingId: string; actionPoints: ActionPoint[] };
  "notification:new": { notification: Notification };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;       // user_id
  wid: string;       // workspace_id
  role: WorkspaceRole;
  iat: number;
  exp: number;
  jti: string;
}
