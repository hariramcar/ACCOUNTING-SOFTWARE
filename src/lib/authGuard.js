import { getSession } from './session';

/**
 * Ensures the caller is authenticated.
 * Throws an Error if no active session is found.
 * @returns {Promise<{userId: string, role: string, username: string, name: string}>}
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session || !session.userId) {
    throw new Error('Unauthorized: Please log in to continue.');
  }
  return session;
}

/**
 * Ensures the caller is authenticated and has the ADMIN role.
 * Throws an Error if unauthenticated or if role is not ADMIN.
 * @returns {Promise<{userId: string, role: string, username: string, name: string}>}
 */
export async function requireAdmin() {
  const session = await requireAuth();
  if (session.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required.');
  }
  return session;
}
