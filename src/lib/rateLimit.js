/**
 * In-memory sliding-window rate limiter for brute-force protection on authentication.
 * Tracks failed attempts by key (IP + username).
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

// Store structure: Map<key, { count: number, firstAttemptAt: number, lockedUntil: number | null }>
const attemptsStore = new Map();

// Periodic cleanup to avoid memory growth (runs every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attemptsStore.entries()) {
    if (record.lockedUntil && record.lockedUntil < now) {
      attemptsStore.delete(key);
    } else if (!record.lockedUntil && now - record.firstAttemptAt > LOCKOUT_DURATION_MS) {
      attemptsStore.delete(key);
    }
  }
}, 10 * 60 * 1000).unref?.();

/**
 * Checks if a login attempt is allowed.
 * @param {string} key - Identifier (e.g. IP address or username)
 * @returns {{ allowed: boolean, remainingAttempts: number, lockoutSeconds?: number }}
 */
export function checkRateLimit(key) {
  if (!key) return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };

  const now = Date.now();
  const record = attemptsStore.get(key);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  // Check if currently locked
  if (record.lockedUntil && record.lockedUntil > now) {
    const lockoutSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, lockoutSeconds };
  }

  // If lockout or window expired, reset
  if (now - record.firstAttemptAt > LOCKOUT_DURATION_MS) {
    attemptsStore.delete(key);
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - record.count);
  return { allowed: remainingAttempts > 0, remainingAttempts };
}

/**
 * Records a failed login attempt.
 * @param {string} key - Identifier
 * @returns {{ allowed: boolean, remainingAttempts: number, lockoutSeconds?: number }}
 */
export function recordFailedAttempt(key) {
  if (!key) return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };

  const now = Date.now();
  let record = attemptsStore.get(key);

  if (!record || now - record.firstAttemptAt > LOCKOUT_DURATION_MS) {
    record = { count: 1, firstAttemptAt: now, lockedUntil: null };
  } else {
    record.count += 1;
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    attemptsStore.set(key, record);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000)
    };
  }

  attemptsStore.set(key, record);
  return {
    allowed: true,
    remainingAttempts: MAX_FAILED_ATTEMPTS - record.count
  };
}

/**
 * Clears rate-limit records on successful authentication.
 * @param {string} key 
 */
export function resetRateLimit(key) {
  if (key) {
    attemptsStore.delete(key);
  }
}
