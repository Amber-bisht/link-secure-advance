import { NextRequest } from 'next/server';

export function getClientIp(request: NextRequest): string {
    // Cloudflare specific header
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp;

    // Standard X-Forwarded-For
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    // Fallback
    return '127.0.0.1';
}
