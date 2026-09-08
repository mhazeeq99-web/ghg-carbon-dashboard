/*
 * Minimal PIN gate for the dashboard.
 * No accounts/email — a single hardcoded 4-digit PIN.
 * "Logged in" is tracked with a httpOnly cookie that the proxy/middleware
 * checks before serving the protected pages.
 */

export const AUTH_COOKIE = 'ghg_pin';
export const AUTH_PIN = '6100';

/** A stable, non-guessable token stored in the auth cookie. */
export const AUTH_TOKEN = 'ghg-dash-7c42a1f0-9e6b-4f3d-8a1c-b5d9e0a3f2c1';

export const MAX_ATTEMPTS = 5;
export const LOCK_SECONDS = 60;
