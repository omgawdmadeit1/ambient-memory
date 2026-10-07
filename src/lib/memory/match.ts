import type { ParsedMemory } from "./types";

export function entityKey(entity: string | null | undefined) {
  return (entity || "").trim().toLowerCase();
}

/** Loose relatedness used to prompt “update this note?” — not to auto-replace. */
export function similarEntity(a: string | null | undefined, b: string | null | undefined) {
  const ka = entityKey(a);
  const kb = entityKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (ka.includes(kb) || kb.includes(ka)) return true;
  if (ka.includes("shoe") && kb.includes("shoe")) return true;
  return false;
}

export function exactEntity(a: string | null | undefined, b: string | null | undefined) {
  const ka = entityKey(a);
  const kb = entityKey(b);
  return !!ka && ka === kb;
}

/**
 * Auto-supersede only when the incoming parse names the same entity as the
 * existing note. Substring matches like “shoe size” vs “kid shoe size” must
 * go through clarification — otherwise an adult size update silently kills
 * the kid’s size (the seeded demo fact).
 */
export function shouldAutoSupersede(
  existingEntity: string | null | undefined,
  parsed: Pick<ParsedMemory, "entity" | "supersedes_hint" | "confidence">,
): boolean {
  const sameEntity =
    exactEntity(existingEntity, parsed.entity) ||
    exactEntity(existingEntity, parsed.supersedes_hint);
  if (!sameEntity) return false;
  return (
    (parsed.confidence >= 0.7 && !!parsed.supersedes_hint) || parsed.confidence >= 0.85
  );
}
