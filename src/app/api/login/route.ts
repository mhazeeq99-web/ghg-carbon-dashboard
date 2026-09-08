import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE,
  AUTH_PIN,
  AUTH_TOKEN,
  MAX_ATTEMPTS,
  LOCK_SECONDS,
} from '@/lib/auth';

/*
 * Simple in-memory rate limiter keyed by client address.
 * Works for a single-instance deployment (self-host / local).
 */
const attempts = new Map<string, { count: number; lockedUntil: number }>();

function clientKey(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || 'local';
  return ip || 'unknown';
}

export async function POST(request: NextRequest) {
  const key = clientKey(request);
  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, lockedUntil: 0 };

  // Locked out?
  if (entry.lockedUntil > now) {
    const wait = Math.ceil((entry.lockedUntil - now) / 1000);
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${wait}s.` },
      { status: 429 }
    );
  }

  let pin = '';
  try {
    const body = await request.json();
    pin = String(body?.pin ?? '').trim();
  } catch {
    pin = '';
  }

  // Basic shape check
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json(
      { error: 'Enter the 4-digit PIN.' },
      { status: 400 }
    );
  }

  if (pin !== AUTH_PIN) {
    entry.count += 1;

    if (entry.count >= MAX_ATTEMPTS) {
      entry.lockedUntil = now + LOCK_SECONDS * 1000;
      entry.count = 0;
      attempts.set(key, entry);

      return NextResponse.json(
        { error: `Too many attempts. Locked for ${LOCK_SECONDS}s.` },
        { status: 429 }
      );
    }

    attempts.set(key, entry);

    const remaining = MAX_ATTEMPTS - entry.count;
    return NextResponse.json(
      {
        error: `Wrong PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} left.`,
      },
      { status: 401 }
    );
  }

  // Success — clear attempts and set the auth cookie.
  attempts.delete(key);

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, AUTH_TOKEN, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
