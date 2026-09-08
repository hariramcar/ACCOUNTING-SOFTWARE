import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.JWT_SECRET_KEY;
if (!secretKey && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL SECURITY ERROR: JWT_SECRET_KEY environment variable is not defined.');
}
const encodedKey = new TextEncoder().encode(secretKey || 'super-secret-key-for-development');

export async function encrypt(payload, expirationTime = '7d') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(encodedKey);
}

export async function decrypt(session) {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function createSession(user, options = {}) {
  const rememberMe = Boolean(options.rememberMe);
  const expirationTime = rememberMe ? '7d' : '12h';
  const maxAge = rememberMe ? 7 * 24 * 60 * 60 : 12 * 60 * 60; // 7 days vs 12 hours

  const session = await encrypt({ 
    userId: user.id, 
    role: user.role, 
    username: user.username,
    name: user.name,
    rememberMe
  }, expirationTime);

  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export async function updateSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return;

  const payload = await decrypt(session);
  if (!payload) return;

  const maxAge = payload.rememberMe ? 7 * 24 * 60 * 60 : 12 * 60 * 60;

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  // Evict across all browser variations with explicit path, maxAge 0 and expired date
  cookieStore.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}

