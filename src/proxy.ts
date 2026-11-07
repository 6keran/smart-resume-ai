import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/sessionAuth';
import { checkAnonymousAtsRateLimit, checkAuthRateLimit } from '@/lib/rateLimit';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminCookie = request.cookies.get('sra_admin_session')?.value;
  const userCookie = request.cookies.get('sra_user_session')?.value;

  // Cryptographically verify token signatures and expiration before trusting any session claims
  const adminPayload = await verifySessionToken(adminCookie);
  const userPayload = await verifySessionToken(userCookie);

  const hasValidAdminSession = Boolean(adminPayload && adminPayload.role === 'ADMIN');
  const hasValidUserSession = Boolean(userPayload && (userPayload.role === 'USER' || userPayload.role === 'ADMIN'));

  // 1. Static and Internal Next.js files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Public Pages (Landing, Legal & Compliance, FAQ, Public ATS Analyzer and Dedicated ATS Score accessible without authentication)
  const isPublicPage = pathname === '/' || pathname === '/privacy' || pathname === '/terms' || pathname === '/faq' || pathname === '/analyzer' || pathname === '/ats-score';
  if (isPublicPage) {
    return NextResponse.next();
  }

  // 3. Public Auth Routes & APIs with brute-force / spam rate limiting
  const isUserAuthPage = pathname === '/login' || pathname === '/register';
  const isAdminAuthPage = pathname === '/admin/login';
  const PUBLIC_AUTH_APIS = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/admin/auth/login',
    '/api/admin/auth/logout',
  ]);
  const normalizedPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const isPublicAuthApi = PUBLIC_AUTH_APIS.has(normalizedPath);

  if (isPublicAuthApi) {
    // Rate limit sensitive POST auth operations (login, admin login, registration)
    if (request.method === 'POST') {
      if (normalizedPath === '/api/auth/login') {
        const rateLimit = checkAuthRateLimit(request, 'login');
        if (!rateLimit.allowed) {
          return NextResponse.json(
            {
              error: 'Too many login attempts. Please wait a few minutes before trying again.',
              message: 'Too many login attempts. Please wait a few minutes before trying again.',
              retryAfter: rateLimit.retryAfter,
            },
            {
              status: 429,
              headers: {
                'Retry-After': String(rateLimit.retryAfter),
                'X-RateLimit-Limit': String(rateLimit.limit),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(rateLimit.resetInSeconds),
              },
            }
          );
        }
      } else if (normalizedPath === '/api/admin/auth/login') {
        const rateLimit = checkAuthRateLimit(request, 'admin_login');
        if (!rateLimit.allowed) {
          return NextResponse.json(
            {
              error: 'Too many administrator login attempts. Please wait a few minutes before trying again.',
              message: 'Too many administrator login attempts. Please wait a few minutes before trying again.',
              retryAfter: rateLimit.retryAfter,
            },
            {
              status: 429,
              headers: {
                'Retry-After': String(rateLimit.retryAfter),
                'X-RateLimit-Limit': String(rateLimit.limit),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(rateLimit.resetInSeconds),
              },
            }
          );
        }
      } else if (normalizedPath === '/api/auth/register') {
        const rateLimit = checkAuthRateLimit(request, 'register');
        if (!rateLimit.allowed) {
          return NextResponse.json(
            {
              error: 'Too many registration attempts. Please wait a few minutes before trying again.',
              message: 'Too many registration attempts. Please wait a few minutes before trying again.',
              retryAfter: rateLimit.retryAfter,
            },
            {
              status: 429,
              headers: {
                'Retry-After': String(rateLimit.retryAfter),
                'X-RateLimit-Limit': String(rateLimit.limit),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(rateLimit.resetInSeconds),
              },
            }
          );
        }
      }
    }
    return NextResponse.next();
  }

  // 4. Anonymous ATS Scan API with Rate Limiting (Allows landing-page ATS scanner to function without exposing unprotected bypasses)
  if (normalizedPath === '/api/resume/analyze') {
    // Authenticated users have full access without anonymous rate limiting
    if (hasValidUserSession || hasValidAdminSession) {
      return NextResponse.next();
    }

    // Anonymous visitors: Enforce sliding-window rate limit (5 scans / 10 mins per IP/visitor)
    const rateLimit = checkAnonymousAtsRateLimit(request);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded for free ATS scans. Please wait a few minutes or create an account to continue.',
          message: 'Rate limit exceeded for free ATS scans. Please wait a few minutes or create an account to continue.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimit.resetInSeconds),
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(rateLimit.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimit.resetInSeconds));

    if (!request.cookies.has('sra_visitor_id')) {
      response.cookies.set('sra_visitor_id', rateLimit.visitorId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }

    return response;
  }

  // 5. Admin Authentication Flow
  if (isAdminAuthPage) {
    if (hasValidAdminSession && !request.nextUrl.searchParams.has('from')) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (pathname === '/admin') {
    if (hasValidAdminSession) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  if (pathname.startsWith('/admin')) {
    if (!hasValidAdminSession) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      const res = NextResponse.redirect(loginUrl);
      if (adminCookie) res.cookies.delete('sra_admin_session');
      return res;
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/admin')) {
    if (!hasValidAdminSession) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 6. User Auth Pages
  if (isUserAuthPage) {
    if (hasValidUserSession && !request.nextUrl.searchParams.has('from')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 7. Protected API routes (all other /api/* remain strictly protected)
  if (pathname.startsWith('/api/')) {
    if (!hasValidUserSession && !hasValidAdminSession) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 8. ALL OTHER APPLICATION ROUTES (including '/builder', '/dashboard', '/improver', '/skills', '/jobs', '/job-match', etc.)
  if (!hasValidUserSession) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname + request.nextUrl.search);
    }
    const res = NextResponse.redirect(loginUrl);
    if (userCookie) {
      res.cookies.delete('sra_user_session');
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image/asset files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};

