
'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { sign, verify } from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'your-super-secret-key-that-is-long';
const COOKIE_NAME = 'auth_session';
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com';

// This is a simplified session payload
interface SessionPayload extends JwtPayload {
  uid: string;
  email: string;
  isAdmin: boolean;
}

export async function createSession(uid: string, email: string): Promise<{ isAdmin: boolean }> {
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const payload: SessionPayload = { uid, email, isAdmin, iat: Math.floor(Date.now() / 1000) };
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours from now

  // Create the token
  const token = sign(payload, SECRET_KEY, { expiresIn: '8h' });

  // Set the cookie
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    path: '/',
    sameSite: 'lax',
  });

  return { isAdmin };
}

export async function logout() {
  (await cookies()).delete(COOKIE_NAME);
  redirect('/'); // Redirect to the employee portal on logout
}

export async function getSession(): Promise<SessionPayload | null> {
  const sessionCookie = (await cookies()).get(COOKIE_NAME);
  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const decoded = verify(sessionCookie.value, SECRET_KEY) as SessionPayload;
    return decoded;
  } catch (error) {
    // This is expected if the token is expired or invalid.
    // We'll treat it as a logged-out state.
    console.log('Session verification failed:', error);
    return null;
  }
}
