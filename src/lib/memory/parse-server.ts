import { createServerFn } from "@tanstack/react-start";
import { parseLocally, normalizeTriggerType } from "./parser";
import type { ParsedMemory } from "./types";

const SYSTEM = `You are a precise memory extraction engine.
Given a single natural-language sentence, extract durable personal facts only.
Ignore chit-chat, questions, or non-memory statements.

Return ONLY valid JSON matching this exact schema (no markdown, no commentary):
{
  "entity": string | null,
  "fact": string | null,
  "trigger_type": "time" | "recurring" | "contextual" | "none",
  "trigger_time": "HH:MM" | null,
  "recurrence_rule": string | null,
  "expiry_date": "YYYY-MM-DD" | null,
  "supersedes_hint": string | null,
  "confidence": number,
  "skip": boolean
}

Rules:
- Prefer structured fields over leaving everything in raw text.
- Time-bound medication or appointment → trigger_type "time" or "recurring" + expiry.
- Persistent facts (sizes, passwords, addresses) → trigger_type "none".
- If the sentence clearly updates a previous fact of the same entity, set supersedes_hint.
- Be deterministic.`;

function coerce(parsed: unknown, fallbackText: string): ParsedMemory {
  if (!parsed || typeof parsed !== "object") return parseLocally(fallbackText);
  const o = parsed as Record<string, unknown>;
  if (o.skip === true) {
    return {
      entity: null,
      fact: null,
      trigger_type: "none",
      trigger_time: null,
      recurrence_rule: null,
      expiry_date: null,
      supersedes_hint: null,
      confidence: 0,
      skip: true,
    };
  }
  return {
    entity: typeof o.entity === "string" ? o.entity : null,
    fact: typeof o.fact === "string" ? o.fact : null,
    trigger_type: normalizeTriggerType(o.trigger_type),
    trigger_time: typeof o.trigger_time === "string" ? o.trigger_time : null,
    recurrence_rule: typeof o.recurrence_rule === "string" ? o.recurrence_rule : null,
    expiry_date: typeof o.expiry_date === "string" ? o.expiry_date : null,
    supersedes_hint: typeof o.supersedes_hint === "string" ? o.supersedes_hint : null,
    confidence: typeof o.confidence === "number" ? o.confidence : 0.7,
    skip: false,
  };
}

export const parseMemoryFn = createServerFn({ method: "POST" })
  .validator((input: { text: string }) => ({ text: String(input?.text ?? "").slice(0, 2000) }))
  .handler(async ({ data }): Promise<{ parsed: ParsedMemory; source: "xai" | "local" }> => {
    const text = data.text.trim();
    if (!text) {
      return { parsed: parseLocally(""), source: "local" };
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { parsed: parseLocally(text), source: "local" };
    }

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0,
          max_tokens: 400,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: text },
          ],
        }),
      });

      if (!res.ok) {
        return { parsed: parseLocally(text), source: "local" };
      }

      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = body.choices?.[0]?.message?.content ?? "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { parsed: parseLocally(text), source: "local" };
      }
      const raw = JSON.parse(jsonMatch[0]) as unknown;
      return { parsed: coerce(raw, text), source: "xai" };
    } catch {
      return { parsed: parseLocally(text), source: "local" };
    }
  });
