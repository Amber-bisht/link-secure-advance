// reCAPTCHA v3 verification utility

export async function verifyCaptcha(token: string): Promise<boolean> {
    try {
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;

        // Development mode: Skip CAPTCHA if no secret key configured
        if (!secretKey) {
            console.warn('⚠️  RECAPTCHA_SECRET_KEY not configured - bypassing verification (DEV MODE)');
            return true; // Allow in development
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


// Check if request is from Railway domain
export function isRailwayDomain(request: Request): boolean {
    const referer = request.headers.get('referer') || '';
    const origin = request.headers.get('origin') || '';

    // Block any railway.app domains
    const railwayPattern = /railway\.app/i;

    return railwayPattern.test(referer) || railwayPattern.test(origin);
}
