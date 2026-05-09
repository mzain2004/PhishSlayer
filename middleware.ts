import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ── Rate Limiting Storage ──────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

function isRateLimited(ip: string, limit: number, pathType: string) {
  const now = Date.now();
  const key = `${ip}:${pathType}`;
  const record = rateLimitMap.get(key) || { count: 0, lastReset: now };

  if (now - record.lastReset > 60000) {
    record.count = 1;
    record.lastReset = now;
    rateLimitMap.set(key, record);
    return false;
  }

  record.count++;
  rateLimitMap.set(key, record);
  return record.count > limit;
}

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/api/(.*)"]);
const isPublicRoute = createRouteMatcher([
  '/', 
  '/sign-in', 
  '/sign-up', 
  '/api/webhooks/clerk', 
  '/api/webhooks/polar', 
  '/api/billing/webhook',
  '/api/connectors/wazuh',
  '/api/ingest', 
  '/api/ingest/batch',
  '/api/health'
]);
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, request) => {
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const { pathname } = request.nextUrl;

  // ── Request ID injection ───────────────────────────────────────────
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  // 1. Rate Limiting
  if (pathname.startsWith("/api/")) {
    if (isRateLimited(ip, 100, "api")) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  } else if (pathname.startsWith("/auth/")) {
    if (isRateLimited(ip, 5, "auth")) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  }

  const { userId } = await auth();

  if (userId && isAuthRoute(request)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isProtectedRoute(request) && !isPublicRoute(request)) {
    await auth.protect({
      unauthenticatedUrl: 'https://phishslayer.tech/sign-in',
    });
  }

  // ── Organization resolution moved to per-request session context only. Do not passthrough headers.
  // No x-resolved headers added here; routes should resolve from session/auth context only.
  
  // 2. Security Headers
  const response = NextResponse.next();
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Forward the request ID on all responses so clients can correlate logs
  response.headers.set("x-request-id", requestId);

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
