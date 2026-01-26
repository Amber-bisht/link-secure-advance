import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { CAPTCHA_CONFIG } from '@/config/captcha';


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

// =====================================================
// Phase B: Request Timing & Pattern Analysis
// =====================================================
const requestTimestamps = new Map<string, number[]>();
const suspiciousIPs = new Map<string, { count: number; lastSeen: number }>();

// Cleanup interval (runs in edge runtime)
const WINDOW_MS = 60000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 60;
const SUSPICIOUS_THRESHOLD = 3;

function getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';
}

function analyzeRequestTiming(ip: string): { allowed: boolean; delay?: number } {
    const now = Date.now();
    const timestamps = requestTimestamps.get(ip) || [];

    // Filter to recent window
    const recent = timestamps.filter(t => now - t < WINDOW_MS);
    recent.push(now);
    requestTimestamps.set(ip, recent.slice(-100)); // Keep last 100

    // Check rate
    if (recent.length > MAX_REQUESTS_PER_WINDOW) {
        return { allowed: false };
    }

    // Check for suspicious patterns (requests too fast/uniform)
    if (recent.length >= 5) {
        const intervals = [];
        for (let i = 1; i < Math.min(recent.length, 10); i++) {
            intervals.push(recent[i] - recent[i - 1]);
        }

        // If all intervals are very similar, it's likely automated
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;

        // Very low variance in timing = bot-like behavior
        if (variance < 100 && avgInterval < 500) {
            markSuspicious(ip);
        }
    }

    return { allowed: true };
}

function markSuspicious(ip: string): void {
    const existing = suspiciousIPs.get(ip) || { count: 0, lastSeen: 0 };
    suspiciousIPs.set(ip, {
        count: existing.count + 1,
        lastSeen: Date.now(),
    });
}

function isSuspicious(ip: string): boolean {
    const record = suspiciousIPs.get(ip);
    if (!record) return false;

    // Decay suspicion over time
    const hoursSinceLastSeen = (Date.now() - record.lastSeen) / 3600000;
    if (hoursSinceLastSeen > 24) {
        suspiciousIPs.delete(ip);
        return false;
    }

    return record.count >= SUSPICIOUS_THRESHOLD;
}

// Detect suspicious header patterns
function hasAnomalousHeaders(request: NextRequest): { suspicious: boolean; reason?: string } {
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLang = request.headers.get('accept-language');
    const acceptEnc = request.headers.get('accept-encoding');
    const secChUa = request.headers.get('sec-ch-ua');

    // Chrome should have sec-ch-ua header
    if (userAgent.toLowerCase().includes('chrome') && !secChUa) {
        return { suspicious: true, reason: 'Chrome UA without sec-ch-ua' };
    }

    // Missing accept-language is unusual for browsers
    if (!acceptLang && !userAgent.includes('bot') && !userAgent.includes('crawler')) {
        return { suspicious: true, reason: 'Missing accept-language' };
    }

    // Check for empty or minimal accept-encoding
    if (!acceptEnc || acceptEnc === '*/*') {
        return { suspicious: true, reason: 'Unusual accept-encoding' };
    }

    return { suspicious: false };
}

export async function middleware(request: NextRequest) {
    const hostname = request.headers.get('host') || '';
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
    const origin = request.headers.get('origin') || '';
    const clientIP = getClientIP(request);

    // =====================================================
    // 1. BOT BLOCKING (before any other processing)
    // =====================================================
    const isBot = BOT_USER_AGENTS.some(pattern => userAgent.includes(pattern));
    if (isBot) {
        console.warn(`[BLOCKED] Bot detected: ${userAgent.substring(0, 50)} from ${clientIP}`);
        return new NextResponse(
            JSON.stringify({ error: 'Access denied', code: 'BOT_DETECTED' }),
            {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    // =====================================================
    // 1.5. CLOUDFLARE BYPASS MITIGATION (Resource Trap & Honeypot)
    // =====================================================
    // Only active if using Cloudflare configuration (own === 2)
    if (CAPTCHA_CONFIG.own === 2) {
        // A. Honeypot Check (Poison Pill)
        const botFlag = request.cookies.get('cf_bot_flag');
        if (botFlag) {
            console.warn(`[BLOCKED] Honeypot triggered by ${clientIP}`);
            return new NextResponse(JSON.stringify({ error: 'Access Denied', code: 'BOT_HONEYPOT' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // B. Resource Trap Verification (Proof of Image Load)
        // Only enforce on the actual verification/redirect APIs
        const path = request.nextUrl.pathname;
        if (path === '/api/v4/redirect' || path === '/api/v4.1/visit') {
            const proofCookie = request.cookies.get('cf_trap_proof');

            if (!proofCookie) {
                // No proof cookie = bypassed image load = bot
                console.warn(`[BLOCKED] Missing resource proof from ${clientIP}`);
                return new NextResponse(JSON.stringify({ error: 'Security verification failed (Resource missing)', code: 'RESOURCE_TRAP' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Verify signature
            const parts = proofCookie.value.split('.');
            console.log(`[DEBUG_MW] Trap Cookie Found: ${proofCookie.value.substring(0, 20)}...`);

            let nonce = '';
            let timestampStr = '';
            let sig = '';

            if (parts.length === 3) {
                [nonce, timestampStr, sig] = parts;
            } else {
                console.warn(`[DEBUG_MW] Invalid cookie format: ${proofCookie.value}`);
                // Invalid format (likely old cookie or tampered)
                return new NextResponse(JSON.stringify({ error: 'Invalid proof format', code: 'INVALID_PROOF_FMT' }), { status: 403 });
            }

            if (!nonce || !timestampStr || !sig) {
                console.warn('[DEBUG_MW] Missing parts in cookie');
                return new NextResponse(JSON.stringify({ error: 'Invalid proof', code: 'INVALID_PROOF' }), { status: 403 });
            }

            const secret = process.env.CHALLENGE_SECRET || process.env.TOKEN_VALIDATION_SECRET || 'fallback-trap-secret';
            const timestamp = parseInt(timestampStr);
            const currentBucket = Math.floor(Date.now() / 3600000);

            // Check if proof is expired (allow 2 hour window: current and previous hour)
            if (currentBucket - timestamp > 1) {
                console.warn(`[DEBUG_MW] Proof expired. Timestamp: ${timestamp}, CurrentBucket: ${currentBucket}`);
                return new NextResponse(JSON.stringify({ error: 'Proof expired', code: 'EXPIRED_PROOF' }), { status: 403 });
            }

            // Web Crypto API HMAC Verification
            const encoder = new TextEncoder();
            const secretKeyData = encoder.encode(secret);
            const payload = `trap-proof:${nonce}:${timestampStr}`;
            // console.log(`[DEBUG_MW] Verifying Payload: ${payload}`); // Careful with logging nonces if sensitive contexts, but okay for debugging
            const payloadData = encoder.encode(payload);

            try {
                const key = await crypto.subtle.importKey(
                    'raw',
                    secretKeyData,
                    { name: 'HMAC', hash: 'SHA-256' },
                    false,
                    ['sign']
                );

                const signatureBuffer = await crypto.subtle.sign(
                    'HMAC',
                    key,
                    payloadData
                );

                // Convert buffer to hex string
                const expectedSig = Array.from(new Uint8Array(signatureBuffer))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');

                if (sig !== expectedSig) {
                    console.warn(`[BLOCKED] Invalid proof signature from ${clientIP}. Received: ${sig.substring(0, 5)}..., Expected: ${expectedSig.substring(0, 5)}...`);
                    console.warn(`[DEBUG_MW] Payload used: ${payload}`);
                    return new NextResponse(JSON.stringify({ error: 'Invalid proof signature', code: 'INVALID_SIG' }), { status: 403 });
                } else {
                    console.log(`[DEBUG_MW] Trap signature verified for IP ${clientIP}`);
                }
            } catch (e) {
                console.error('Crypto error in middleware', e);
                return new NextResponse(JSON.stringify({ error: 'Security validation error', code: 'CRYPTO_ERR' }), { status: 500 });
            }
        }
    }

    // =====================================================
    // Phase B: Request Timing Analysis
    // =====================================================

    const timingResult = analyzeRequestTiming(clientIP);
    if (!timingResult.allowed) {
        console.warn(`[RATE LIMIT] IP ${clientIP} exceeded request limit`);
        return new NextResponse(
            JSON.stringify({ error: 'Too many requests', code: 'RATE_LIMITED' }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': '60'
                }
            }
        );
    }

    // =====================================================
    // Phase B: Suspicious Header Pattern Detection
    // =====================================================
    const headerAnalysis = hasAnomalousHeaders(request);
    if (headerAnalysis.suspicious && isSuspicious(clientIP)) {
        console.warn(`[SUSPICIOUS] ${clientIP}: ${headerAnalysis.reason}`);
        // Don't block, but add delay header for client-side use
        // This information is logged and could be used for enhanced challenges
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
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://static.cloudflareinsights.com https://challenges.cloudflare.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://www.googletagmanager.com https://www.clarity.ms https://*.clarity.ms; " +
        "worker-src 'self' blob:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https: blob: https://www.googletagmanager.com; " +
        "connect-src 'self' https://captcha-p.asprin.dev https://links.asprin.dev https://cloudflareinsights.com https://challenges.cloudflare.com https://*.cloudflare.com https://www.google-analytics.com https://www.clarity.ms https://*.clarity.ms; " +
        "frame-src 'self' https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://challenges.cloudflare.com; " +
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
    response.headers.set('Referrer-Policy', 'no-referrer-when-downgrade');

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
                'Content-Type, Authorization, X-Client-Proof, X-CSRF-Token, X-Session-Id'
            );
        } else {
            // Log unauthorized CORS attempts
            console.warn(`[CORS BLOCKED] Origin: ${origin} attempting to access ${request.url}`);
            markSuspicious(clientIP);
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

