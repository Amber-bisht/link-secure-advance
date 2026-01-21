import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// =====================================================
// SECURITY CONFIGURATION
// =====================================================
const ALLOWED_ORIGINS = [
    'https://links.asprin.dev',
    'https://www.links.asprin.dev',
    'https://captcha-p.asprin.dev',
    // Development
    'http://localhost:3000',
    'http://localhost:3001',
];

// Known bot User-Agents to block
const BOT_USER_AGENTS = [
    'python-requests', 'python-urllib', 'aiohttp', 'httpx',
    'curl/', 'wget/', 'libcurl',
    'scrapy', 'httpclient', 'go-http',
    'java/', 'okhttp', 'apache-httpclient',
    // Headless browsers
    'headlesschrome', 'phantomjs', 'puppeteer',
    'playwright', 'selenium', 'nightmare',
];

export function middleware(request: NextRequest) {
    const hostname = request.headers.get('host') || '';
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
    const origin = request.headers.get('origin') || '';

    // =====================================================
    // 1. BOT BLOCKING (before any other processing)
    // =====================================================
    const isBot = BOT_USER_AGENTS.some(pattern => userAgent.includes(pattern));
    if (isBot) {
        console.warn(`[BLOCKED] Bot detected: ${userAgent.substring(0, 50)} from ${request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'}`);
        return new NextResponse(
            JSON.stringify({ error: 'Access denied', code: 'BOT_DETECTED' }),
            {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    // =====================================================
    // 2. Domain redirection: uclinks.vercel.app -> links.asprin.dev
    // =====================================================
    if (hostname.includes('uclinks.vercel.app')) {
        const url = request.nextUrl.clone();
        url.hostname = 'links.asprin.dev';
        url.protocol = 'https:';
        url.port = '';
        return NextResponse.redirect(url);
    }

    // =====================================================
    // 3. SECURITY HEADERS
    // =====================================================
    const response = NextResponse.next();

    // Content Security Policy - Allow Cloudflare and necessary resources
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://challenges.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https: blob:; " +
        "connect-src 'self' https://captcha-p.asprin.dev https://links.asprin.dev https://cloudflareinsights.com https://*.cloudflare.com; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self';"
    );

    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // XSS Protection (legacy but still useful)
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (restrict features)
    response.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );

    // HSTS (if not behind proxy that handles it)
    response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
    );

    // =====================================================
    // 4. CORS - Strict origin checking (NOT wildcard)
    // =====================================================
    if (origin) {
        if (ALLOWED_ORIGINS.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Access-Control-Allow-Credentials', 'true');
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            response.headers.set(
                'Access-Control-Allow-Headers',
                'Content-Type, Authorization, X-Client-Proof, X-CSRF-Token'
            );
        } else {
            // Log unauthorized CORS attempts
            console.warn(`[CORS BLOCKED] Origin: ${origin} attempting to access ${request.url}`);
            // Don't set CORS headers - browser will block the request
        }
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 204,
            headers: response.headers
        });
    }

    return response;
}

// Apply middleware to all routes
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

