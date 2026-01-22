export async function getCaptchaMetrics() {
    const apiUrl = process.env.CAPTCHA_API_URL;
    const adminKey = process.env.CAPTCHA_ADMIN_KEY;

    if (!apiUrl || !adminKey) {
        console.error('Missing CAPTCHA_API_URL or CAPTCHA_ADMIN_KEY');
        return null;
    }

    try {
        const res = await fetch(`${apiUrl}/api/metrics`, {
            headers: {
                'x-admin-key': adminKey,
                'Content-Type': 'application/json',
            },
            cache: 'no-store', // Ensure fresh data
        });

        if (!res.ok) {
            console.error(`Failed to fetch metrics: ${res.status} ${res.statusText}`);
            return null;
        }

        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error fetching captcha metrics:', error);
        return null;
    }
}
