/**
 * In-memory sliding window for POST /api/meetings/:id/join.
 * Resets on server restart; scale-out would need Redis or similar.
 */
const buckets = new Map<string, number[]>();

function maxJoinsPerMinute(): number {
  const raw = process.env.MEETING_JOIN_MAX_PER_MINUTE;
  const n = raw ? parseInt(raw, 10) : 30;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 30;
}

const WINDOW_MS = 60_000;

export function allowMeetingJoin(meetingSlug: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const limit = maxJoinsPerMinute();
  const now = Date.now();
  const key = meetingSlug;
  const prev = buckets.get(key) ?? [];
  const pruned = prev.filter((t) => now - t < WINDOW_MS);

  if (pruned.length >= limit) {
    const oldest = pruned[0]!;
    const retryAfterMs = WINDOW_MS - (now - oldest);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  pruned.push(now);
  buckets.set(key, pruned);
  return { ok: true };
}
