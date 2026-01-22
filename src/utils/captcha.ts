// reCAPTCHA v3 verification utility

export async function verifyCaptcha(token: string): Promise<boolean> {
    try {
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;

        // IMPORTANT: Fail closed in production if secret is missing.
        // (Fail-open here becomes an instant bypass if env vars are misconfigured.)
        if (!secretKey) {
            console.error('❌ CRITICAL: RECAPTCHA_SECRET_KEY not configured. Failing closed.');
            return false;
        }

        // Use the siteverify endpoint (works for both v2 and v3)
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${secretKey}&response=${token}`,
        });

        const data = await response.json();

        // Log response for debugging
        if (!data.success) {
            console.error('reCAPTCHA verification failed:', data['error-codes']);
        } else {
            console.log('reCAPTCHA score:', data.score);
        }

        // For v3: Check both success and score
        // For v2: Only success is returned (no score)
        if (data.score !== undefined) {
            // v3 response - check score (0.0 to 1.0, higher is better)
            return data.success && data.score >= 0.5;
        } else {
            // v2 response or no score - just check success
            return data.success;
        }
    } catch (error) {
        console.error('CAPTCHA verification error:', error);
        return false;
    }
}

/**
 * Verify Custom CAPTCHA token using server-side siteverify endpoint
 * Works like Cloudflare Turnstile / Google reCAPTCHA verification
 * 
 * @param token - The captcha success token from frontend
 * @param remoteip - Optional client IP for additional verification
 */
export async function verifyCustomCaptcha(token: string, remoteip?: string): Promise<boolean> {
    try {
        const secretKey = process.env.CUSTOM_CAPTCHA_SECRET_KEY;
        const captchaApiUrl = process.env.CUSTOM_CAPTCHA_API_URL || 'https://captcha-p.asprin.dev/api/image';

        // IMPORTANT: Fail closed in production if secret is missing
        if (!secretKey) {
            console.error('❌ CRITICAL: CUSTOM_CAPTCHA_SECRET_KEY not configured. Failing closed.');
            return false;
        }

        if (!token || typeof token !== 'string') {
            console.error('Custom CAPTCHA: Invalid token format');
            return false;
        }

        // Call the siteverify endpoint (like Cloudflare/Google)
        const response = await fetch(`${captchaApiUrl}/siteverify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                secret: secretKey,
                response: token,
                remoteip: remoteip || undefined,
            }),
        });

        const data = await response.json();

        if (!data.success) {
            console.error('Custom CAPTCHA verification failed:', data['error-codes'] || data.message);
            return false;
        }

        console.log('Custom CAPTCHA: Token verified successfully at', data.challenge_ts);
        return true;
    } catch (error) {
        console.error('Custom CAPTCHA verification error:', error);
        return false;
    }
}




// Check if request is from Railway domain
export function isRailwayDomain(request: Request): boolean {
    const referer = request.headers.get('referer') || '';
    const origin = request.headers.get('origin') || '';

    // Block any railway.app domains
    const railwayPattern = /railway\.app/i;

    return railwayPattern.test(referer) || railwayPattern.test(origin);
}
