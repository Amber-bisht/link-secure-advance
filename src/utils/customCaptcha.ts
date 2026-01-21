// Custom CAPTCHA Integration for captcha-p.asprin.dev
// This file handles communication with the custom CAPTCHA system

const CAPTCHA_IMAGE_API = 'https://captcha-p.asprin.dev/api/image';
const CAPTCHA_TEXT_API = 'https://captcha-p.asprin.dev/api/text';

// Types
export interface CaptchaChallenge {
    success: boolean;
    sessionId: string;
    question: string;
    images: Array<{ id: string; url: string }>;
    token: string;
    csrfToken: string;
    expiresIn: number;
}

export interface CaptchaVerifyResponse {
    success: boolean;
    message?: string;
    token?: string;
}

/**
 * Fetch a new image CAPTCHA challenge
 */
export async function fetchImageCaptchaChallenge(): Promise<CaptchaChallenge | null> {
    try {
        const response = await fetch(`${CAPTCHA_IMAGE_API}/api/captcha`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Failed to fetch CAPTCHA challenge:', response.status);
            return null;
        }

        const data = await response.json();

        if (!data.success) {
            console.error('CAPTCHA challenge error:', data.error);
            return null;
        }

        return data as CaptchaChallenge;
    } catch (error) {
        console.error('Error fetching CAPTCHA challenge:', error);
        return null;
    }
}

/**
 * Verify image CAPTCHA selection
 */
export async function verifyImageCaptcha(
    sessionId: string,
    selectedImages: string[],
    token: string,
    csrfToken: string,
    behaviorData?: object
): Promise<CaptchaVerifyResponse> {
    try {
        const response = await fetch(`${CAPTCHA_IMAGE_API}/api/verify`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify({
                sessionId,
                selectedImages,
                token,
                behaviorData,
            }),
        });

        const data = await response.json();
        return data as CaptchaVerifyResponse;
    } catch (error) {
        console.error('Error verifying CAPTCHA:', error);
        return { success: false, message: 'Verification request failed' };
    }
}

/**
 * Get the full image URL from the CAPTCHA server
 */
export function getCaptchaImageUrl(imageId: string): string {
    return `${CAPTCHA_IMAGE_API}/api/image/${imageId}`;
}
