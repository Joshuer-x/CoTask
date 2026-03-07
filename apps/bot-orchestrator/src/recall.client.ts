const RECALL_BASE = "https://us-east-1.recall.ai/api/v1";

const headers = () => ({
  Authorization: `Token ${process.env["RECALL_AI_API_KEY"] ?? ""}`,
  "Content-Type": "application/json",
});

export interface CreateBotOptions {
  meetingUrl: string;
  botName?: string;
  meetingId: string; // CoTask internal meeting ID stored as metadata
}

export async function createBot(opts: CreateBotOptions) {
  const res = await fetch(`${RECALL_BASE}/bot`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      meeting_url: opts.meetingUrl,
      bot_name: opts.botName ?? "CoTask Notetaker",
      metadata: { cotask_meeting_id: opts.meetingId },
      transcription_options: { provider: "assembly_ai" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Recall.ai createBot failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ id: string; status_changes: unknown[] }>;
}

export async function removeBot(botId: string) {
  const res = await fetch(`${RECALL_BASE}/bot/${botId}/leave_call`, {
    method: "POST",
    headers: headers(),
  });
  return res.ok;
}
