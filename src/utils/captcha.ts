// Cloudflare Turnstile verification utility

export async function verifyTurnstile(token: string): Promise<boolean> {
    try {
        const secretKey = process.env.TURNSTILE_SECRET_KEY;

        // IMPORTANT: Fail closed in production if secret is missing.
        if (!secretKey) {
            console.error('❌ CRITICAL: TURNSTILE_SECRET_KEY not configured. Failing closed.');
            return false;
        }

        const formData = new FormData();
        formData.append('secret', secretKey);
        formData.append('response', token);

        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!data.success) {
            console.error('Turnstile verification failed:', data['error-codes']);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Turnstile verification error:', error);
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
