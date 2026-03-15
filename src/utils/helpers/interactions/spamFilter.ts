import { spamFilter } from "@/root/bot-config.json";

// ---------------------------------------------------------------------------
// Per-user spam detection & cooldown
// ---------------------------------------------------------------------------

/** Rolling list of command timestamps per user. */
const userCommandTimestamps = new Map<string, number[]>();

/** Epoch (ms) at which a user's cooldown expires. */
const userCooldowns = new Map<string, number>();

type SpamCheckResult =
  | { blocked: true; remainingMs: number }
  | { blocked: false };

/**
 * Check whether a user is currently blocked by the spam filter.
 *
 * Call this at the start of every interaction — it records the timestamp and,
 * when the burst threshold is exceeded, places the user on cooldown.
 */

export function checkSpamFilter(userId: string): SpamCheckResult {
  const now = Date.now();

  // ── Active cooldown? ────────────────────────────────────────────────
  const cooldownExpiry = userCooldowns.get(userId);
  if (cooldownExpiry && now < cooldownExpiry) {
    return { blocked: true, remainingMs: cooldownExpiry - now };
  }

  // Cooldown has expired — clean it up.
  if (cooldownExpiry) {
    userCooldowns.delete(userId);
  }

  // ── Record this command ─────────────────────────────────────────────
  const timestamps = userCommandTimestamps.get(userId) ?? [];
  timestamps.push(now);

  // Prune entries older than the burst window.
  const windowStart = now - spamFilter.burstWindowMs;
  const recent = timestamps.filter((t) => t > windowStart);
  userCommandTimestamps.set(userId, recent);

  // ── Burst threshold exceeded? ───────────────────────────────────────
  if (recent.length >= spamFilter.maxCommands) {
    const expiry = now + spamFilter.cooldownMs;
    userCooldowns.set(userId, expiry);
    userCommandTimestamps.delete(userId); // reset history
    return { blocked: true, remainingMs: spamFilter.cooldownMs };
  }

  return { blocked: false };
}
