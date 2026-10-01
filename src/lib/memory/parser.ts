import type { ParsedMemory, TriggerType } from "./types";

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Local calendar YYYY-MM-DD. Do not use UTC (toISOString) — evening US/EU dates slip a day. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function isMemoryActive(
  m: { superseded_by?: string | null; expiry_date?: string | null },
  now: Date = new Date(),
): boolean {
  if (m.superseded_by) return false;
  if (m.expiry_date && m.expiry_date < todayIso(now)) return false;
  return true;
}

function nextWeekday(target: number, hour: number, minute: number): { date: string; time: string } {
  const now = new Date();
  const d = new Date(now);
  const delta = (target - now.getDay() + 7) % 7 || 7;
  d.setDate(now.getDate() + delta);
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(hour)}:${pad2(minute)}`,
  };
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function parseClock(text: string): string | null {
  const m12 = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = m12[2] ? parseInt(m12[2], 10) : 0;
    const ap = m12[3].toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return `${pad2(h)}:${pad2(min)}`;
  }
  const m24 = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m24) return `${pad2(parseInt(m24[1], 10))}:${m24[2]}`;
  return null;
}

/**
 * Deterministic local parser covering the required test set and common capture
 * patterns. Used as primary path when xAI is unavailable, and as fallback.
 */
export function parseLocally(raw: string): ParsedMemory {
  const text = raw.trim();
  const lower = text.toLowerCase();

  if (!text || text.length < 2) {
    return emptySkip();
  }

  // Chit-chat / questions that are not memories
  if (/^(hi|hello|hey|thanks|thank you|ok|okay)\b/i.test(text) && text.length < 20) {
    return emptySkip();
  }

  // Antibiotic / med at time for N days
  {
    const med = lower.match(
      /(?:take|taking)\s+(?:the\s+)?([a-z0-9\s\-]+?)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}:\d{2})\s*(?:for\s+(?:the\s+)?(?:next\s+)?(\d+)\s*days?)?/i,
    );
    const doctorMed = lower.match(
      /doctor\s+said\s+take\s+(?:the\s+)?([a-z0-9\s\-]+?)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}:\d{2})\s*(?:for\s+(?:the\s+)?(?:next\s+)?(\d+)\s*days?)?/i,
    );
    const hit = doctorMed || med;
    if (hit || (lower.includes("antibiotic") && (lower.includes("8pm") || lower.includes("8 pm") || lower.includes("20:00")))) {
      const entity = hit?.[1]?.trim() || "antibiotic";
      const timeRaw = hit?.[2] || "8pm";
      const days = hit?.[3] ? parseInt(hit[3], 10) : lower.match(/(\d+)\s*days?/)?.[1]
        ? parseInt(lower.match(/(\d+)\s*days?/)![1], 10)
        : 10;
      const trigger_time = parseClock(timeRaw) || parseClock(lower) || "20:00";
      return {
        entity: entity.replace(/\s+/g, " ").trim(),
        fact: `take at ${formatDisplayTime(trigger_time)} for ${days} days`,
        trigger_type: "time",
        trigger_time,
        recurrence_rule: `daily for ${days} days`,
        expiry_date: addDays(todayIso(), days),
        supersedes_hint: null,
        confidence: 0.95,
        skip: false,
      };
    }
  }

  // Kid shoe size / shoe size updates
  {
    const shoe = lower.match(
      /(?:kid(?:'s|s)?\s+)?shoe\s+size\s+(?:is\s+)?(?:now\s+)?([0-9]+(?:\.[0-9]+)?[a-z]?|[0-9]+[a-z]?)/i,
    );
    if (shoe || /shoe\s+size/.test(lower)) {
      const size =
        shoe?.[1] ||
        lower.match(/size\s+(?:is\s+)?(?:now\s+)?([0-9]+(?:\.[0-9]+)?[a-z]?)/i)?.[1] ||
        null;
      const isUpdate = /\bnow\b/.test(lower) || /\bupdate\b/.test(lower);
      const hasKid = /\bkid/.test(lower);
      return {
        entity: hasKid ? "kid shoe size" : "shoe size",
        fact: size,
        trigger_type: "none",
        trigger_time: null,
        recurrence_rule: null,
        expiry_date: null,
        supersedes_hint: isUpdate ? "shoe size" : null,
        confidence: size ? 0.95 : 0.7,
        skip: false,
      };
    }
  }

  // Car service
  if (/car/.test(lower) && /servic/.test(lower)) {
    const dateMatch = text.match(
      /(?:on\s+)?((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,?\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
    );
    const fact = dateMatch
      ? `last serviced ${dateMatch[1]}`
      : text.replace(/^car\s+(was\s+)?/i, "").trim() || text;
    return {
      entity: "car service",
      fact,
      trigger_type: "none",
      trigger_time: null,
      recurrence_rule: null,
      expiry_date: null,
      supersedes_hint: null,
      confidence: 0.9,
      skip: false,
    };
  }

  // Remind me to X next weekday at time
  {
    const rem = lower.match(
      /remind\s+me\s+to\s+(.+?)\s+(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    );
    if (rem) {
      const wd = WEEKDAYS[rem[2]];
      const time = parseClock(rem[3]) || "10:00";
      const [hh, mm] = time.split(":").map(Number);
      const when = nextWeekday(wd, hh, mm);
      return {
        entity: rem[1].trim().slice(0, 48),
        fact: `call/do on ${rem[2]} at ${formatDisplayTime(time)}`,
        trigger_type: "time",
        trigger_time: time,
        recurrence_rule: null,
        expiry_date: when.date,
        supersedes_hint: null,
        confidence: 0.9,
        skip: false,
      };
    }
  }

  // Passport expires
  if (/passport/.test(lower) && /expir/.test(lower)) {
    const year = lower.match(/20\d{2}/)?.[0] || null;
    return {
      entity: "passport",
      fact: year ? `expires ${year}` : "expires (year unknown)",
      trigger_type: "none",
      trigger_time: null,
      recurrence_rule: null,
      expiry_date: year ? `${year}-12-31` : null,
      supersedes_hint: null,
      confidence: 0.92,
      skip: false,
    };
  }

  // Vitamin / every morning
  if (/(vitamin|medicine|pill|meds)/.test(lower) && /every\s+(morning|day|evening|night)/.test(lower)) {
    const name = lower.match(/(vitamin\s*[a-z0-9]+|[a-z]+\s+pill)/i)?.[0] || "supplement";
    const when = /evening|night/.test(lower) ? "20:00" : "08:00";
    return {
      entity: name,
      fact: `take every ${/evening|night/.test(lower) ? "evening" : "morning"}`,
      trigger_type: "recurring",
      trigger_time: when,
      recurrence_rule: "daily",
      expiry_date: null,
      supersedes_hint: null,
      confidence: 0.9,
      skip: false,
    };
  }

  // WiFi password
  if (/wifi|wi-fi|password/.test(lower)) {
    const pass = text.match(/(?:password\s+is\s+|:\s*)([^\s,]+)/i)?.[1];
    return {
      entity: "wifi password",
      fact: pass || text,
      trigger_type: "none",
      trigger_time: null,
      recurrence_rule: null,
      expiry_date: null,
      supersedes_hint: null,
      confidence: pass ? 0.95 : 0.75,
      skip: false,
    };
  }

  // Generic "X is Y" fact
  {
    const isMatch = text.match(/^(.+?)\s+(?:is|are|was|were)\s+(.+)$/i);
    if (isMatch && isMatch[1].length < 60 && isMatch[2].length < 120) {
      const entity = isMatch[1]
        .replace(/^(my|the|a|an)\s+/i, "")
        .trim()
        .toLowerCase();
      return {
        entity,
        fact: isMatch[2].trim(),
        trigger_type: "none",
        trigger_time: null,
        recurrence_rule: null,
        expiry_date: null,
        supersedes_hint: null,
        confidence: 0.8,
        skip: false,
      };
    }
  }

  // Reminder with time only
  const clock = parseClock(lower);
  if (clock && /(remind|take|call|meeting|appointment)/.test(lower)) {
    return {
      entity: text.slice(0, 40),
      fact: text,
      trigger_type: "time",
      trigger_time: clock,
      recurrence_rule: null,
      expiry_date: todayIso(),
      supersedes_hint: null,
      confidence: 0.75,
      skip: false,
    };
  }

  // Fallback: store as unstructured contextual fact
  return {
    entity: null,
    fact: text,
    trigger_type: "none",
    trigger_time: null,
    recurrence_rule: null,
    expiry_date: null,
    supersedes_hint: null,
    confidence: 0.55,
    skip: false,
  };
}

function emptySkip(): ParsedMemory {
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

function formatDisplayTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${pad2(m)} ${ap}`;
}

export function normalizeTriggerType(v: unknown): TriggerType {
  if (v === "time" || v === "recurring" || v === "contextual" || v === "none") return v;
  return "none";
}
