export type TriggerType = "time" | "recurring" | "contextual" | "none";
export type ParseStatus = "success" | "failed" | "raw";

export interface ParsedMemory {
  entity: string | null;
  fact: string | null;
  trigger_type: TriggerType;
  trigger_time: string | null; // HH:MM 24h
  recurrence_rule: string | null;
  expiry_date: string | null; // YYYY-MM-DD
  supersedes_hint: string | null;
  confidence: number;
  skip: boolean;
}

export interface Memory {
  id: string;
  raw_text: string;
  entity: string | null;
  fact: string | null;
  trigger_type: TriggerType;
  trigger_time: string | null;
  recurrence_rule: string | null;
  expiry_date: string | null;
  superseded_by: string | null;
  parse_status: ParseStatus;
  created_at: string;
  updated_at: string;
  last_notified_date: string | null;
}

export interface CaptureResult {
  memory: Memory | null;
  needs_clarification: boolean;
  clarification_entity?: string;
  candidate_id?: string;
  message: string;
}
