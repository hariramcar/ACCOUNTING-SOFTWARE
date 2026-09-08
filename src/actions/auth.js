'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession, deleteSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rateLimit';

// Precomputed valid bcrypt hash for constant-time comparison on nonexistent usernames
const DUMMY_HASH = '$2a$10$wN31X2yH6eMvG6N5Y1ZqKu8rVnN.Zq01G4u0H4U1ZqKu8rVnN.Zq0';

export async function login(prevStateOrFormData, maybeFormData) {
  const formData = maybeFormData instanceof FormData ? maybeFormData : (prevStateOrFormData instanceof FormData ? prevStateOrFormData : null);
  
  if (!formData) {
    return { success: false, error: 'Invalid form submission.' };
  }

  const username = formData.get('username')?.toString().trim();
  const password = formData.get('password')?.toString();
  const rememberMe = formData.get('rememberMe') === 'on' || formData.get('rememberMe') === 'true';

  if (!username || !password) {
    return { success: false, error: 'Username and password are required.' };
  }

  const rateLimitKey = username.toLowerCase();

  // 1. Rate Limit Enforcement (Brute-force defense)
  const rateLimitStatus = checkRateLimit(rateLimitKey);
  if (!rateLimitStatus.allowed) {
    const minutes = Math.ceil((rateLimitStatus.lockoutSeconds || 900) / 60);
    return {
      success: false,
      error: `Security Alert: Too many failed login attempts. Access is locked for ${minutes} minutes to protect your ledger.`
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username }
    });

    // 2. Timing attack mitigation: run bcrypt on dummy hash if user does not exist
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      const attempt = recordFailedAttempt(rateLimitKey);
      const remainingMsg = attempt.remainingAttempts > 0 
        ? ` (${attempt.remainingAttempts} attempt${attempt.remainingAttempts === 1 ? '' : 's'} remaining)`
        : ' (Account temporarily locked for 15 minutes)';
      return { success: false, error: `Invalid username or password.${remainingMsg}` };
    }

    // 3. Password Verification
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      const attempt = recordFailedAttempt(rateLimitKey);
      const remainingMsg = attempt.remainingAttempts > 0 
        ? ` (${attempt.remainingAttempts} attempt${attempt.remainingAttempts === 1 ? '' : 's'} remaining)`
        : ' (Account temporarily locked for 15 minutes)';
      return { success: false, error: `Invalid username or password.${remainingMsg}` };
    }

    // 4. Success -> Reset rate limit counters
    resetRateLimit(rateLimitKey);

    // 5. Create session with Remember Me lifespan preference
    await createSession(user, { rememberMe });
    
    // 6. Role-based executive redirect
    if (user.role === 'ADMIN') {
      redirect('/profit');
    } else {
      redirect('/expenses');
    }
    
  } catch (error) {
    if (error.message === 'NEXT_REDIRECT') {
      throw error;
    }
    console.error('Login error:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}

export async function switchAccount() {
  await deleteSession();
  redirect('/login?switched=true');
}


