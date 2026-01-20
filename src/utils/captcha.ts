// reCAPTCHA v3 verification utility

export async function verifyCaptcha(token: string): Promise<boolean> {
    try {
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;

        // IMPORTANT: Fail closed in production if secret is missing.
        // (Fail-open here becomes an instant bypass if env vars are misconfigured.)
        if (!secretKey) {
            const isProd = process.env.NODE_ENV === 'production';
            console.warn('⚠️  RECAPTCHA_SECRET_KEY not configured');
            return !isProd; // allow only in non-production
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

export async function verifyCustomCaptcha(token: string): Promise<boolean> {
    try {
        const response = await fetch('https://captcha.asprin.dev/api/v3/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!data.success) {
            console.error('Custom CAPTCHA verification failed:', data.reasons);
        } else {
            console.log('Custom CAPTCHA score:', data.score);
        }

        return data.success && data.passed;
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
