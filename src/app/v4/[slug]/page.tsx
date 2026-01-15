"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle, Lock } from "lucide-react";
import { CAPTCHA_CONFIG } from "@/config/captcha";

export default function V4RedirectPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [status, setStatus] = useState<'loading' | 'verifying' | 'redirecting' | 'error'>('loading');
    const [error, setError] = useState('');

    useEffect(() => {
        const verifyAndRedirect = async () => {
            try {
                setStatus('loading');

                // Check if CAPTCHA is configured
                const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

                if (!siteKey) {
                    console.warn('⚠️ CAPTCHA not configured - using development mode');
                    // Development mode: directly call API with bypass token
                    const response = await fetch('/api/v4/redirect', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            slug: slug,
                            captchaToken: 'development-bypass',
                        }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        setError(data.error || 'Failed to verify. Please try again.');
                        setStatus('error');
                        return;
                    }

                    setStatus('redirecting');
                    window.location.href = data.url;
                    return;
                }

                // Production mode: Load and execute CAPTCHA
                setStatus('verifying');

                if (CAPTCHA_CONFIG.own === 2) {
                    // Cloudflare Turnstile
                    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
                        setError('Turnstile configuration missing');
                        setStatus('error');
                        return;
                    }

                    // Load script
                    if (!document.getElementById('turnstile-script')) {
                        const script = document.createElement('script');
                        script.id = 'turnstile-script';
                        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                        document.head.appendChild(script);
                    }

                    // Wait for Turnstile API
                    const checkTurnstile = setInterval(() => {
                        if ((window as any).turnstile) {
                            clearInterval(checkTurnstile);
                            try {
                                (window as any).turnstile.render('#turnstile-widget', {
                                    sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
                                    theme: 'dark',
                                    callback: async (token: string) => {
                                        await submitVerification(token);
                                    },
                                });
                            } catch (e) {
                                console.error('Turnstile render error:', e);
                            }
                        }
                    }, 100);

                    setTimeout(() => clearInterval(checkTurnstile), 10000);
                    return;
                }

                let token = '';

                if (CAPTCHA_CONFIG.own === 1) {
                    // Load custom CAPTCHA script
                    if (!(window as any).CustomCaptchaV3) {
                        const script = document.createElement('script');
                        script.src = `https://captcha.asprin.dev/captcha-v3.js`;

                        script.onerror = () => {
                            console.error('Failed to load Custom CAPTCHA script');
                            setError('Failed to load security verification. Please check your connection.');
                            setStatus('error');
                        };

                        document.head.appendChild(script);

                        await new Promise((resolve, reject) => {
                            script.onload = resolve;
                            script.onerror = reject;
                        });
                    }

                    await new Promise(resolve => setTimeout(resolve, 1500));
                    token = (window as any).CustomCaptchaV3.execute(slug, 'redirect');
                } else {
                    // Load reCAPTCHA script
                    if (!(window as any).grecaptcha) {
                        const script = document.createElement('script');
                        script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;

                        script.onerror = () => {
                            console.error('Failed to load reCAPTCHA script');
                            setError('Failed to load security verification. Please check your connection.');
                            setStatus('error');
                        };

                        document.head.appendChild(script);

                        await new Promise((resolve, reject) => {
                            script.onload = resolve;
                            script.onerror = reject;
                        });

                        await new Promise<void>(resolve => {
                            const checkReady = setInterval(() => {
                                if ((window as any).grecaptcha?.ready) {
                                    clearInterval(checkReady);
                                    (window as any).grecaptcha.ready(() => resolve());
                                }
                            }, 100);

                            setTimeout(() => {
                                clearInterval(checkReady);
                                resolve();
                            }, 10000);
                        });
                    }

                    token = await (window as any).grecaptcha.execute(siteKey, { action: 'redirect' });
                }

                await submitVerification(token);

            } catch (err: any) {
                console.error('Redirect error:', err);
                setError(err.message || 'An error occurred. Please try again.');
                setStatus('error');
            }
        };

        const submitVerification = async (captchaToken: string) => {
            // Call API to verify CAPTCHA and get redirect URL
            try {
                const response = await fetch('/api/v4/redirect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        slug: slug,
                        captchaToken: captchaToken,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || 'Failed to verify. Please try again.');
                    setStatus('error');
                    return;
                }

                // Redirect to the decoded URL
                setStatus('redirecting');
                window.location.href = data.url;
            } catch (err: any) {
                console.error('Submit error:', err);
                setError(err.message || 'Verification failed');
                setStatus('error');
            }
        };

        if (slug) {
            verifyAndRedirect();
        }
    }, [slug, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-black">
            <div className="max-w-md w-full p-8 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800">
                {/* Unlocked Logo/Title */}
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-zinc-800/50 border border-white/5">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">links.asprin.dev</h1>
                    <p className="text-xs text-zinc-500">Secure Link Verification</p>
                </div>

                {status === 'loading' && (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/10 border-t-white mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            Loading...
                        </h2>
                        <p className="text-sm text-zinc-400">
                            Preparing secure redirect
                        </p>
                    </div>
                )}

                {status === 'verifying' && (
                    <div className="text-center">
                        {CAPTCHA_CONFIG.own === 2 ? (
                            <div className="flex flex-col items-center">
                                <div id="turnstile-widget" className="mb-4"></div>
                                <p className="text-sm text-zinc-400">
                                    Please complete the security check
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/10 border-t-white mx-auto mb-4"></div>
                                <h2 className="text-xl font-semibold text-white mb-2">
                                    Verifying...
                                </h2>
                                <p className="text-sm text-zinc-400">
                                    Checking security verification
                                </p>
                            </>
                        )}
                    </div>
                )}

                {status === 'redirecting' && (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/10 border-t-white mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            Redirecting...
                        </h2>
                        <p className="text-sm text-zinc-400">
                            Taking you to your destination
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <AlertCircle className="w-12 h-12 text-red-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            Verification Failed
                        </h2>
                        <p className="text-sm text-red-400 mb-4">
                            {error}
                        </p>
                        <button
                            onClick={() => router.push('/')}
                            className="px-6 py-3 bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white rounded-xl transition-all w-full font-medium"
                        >
                            Go to Home
                        </button>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <p className="text-xs text-zinc-600">
                        Protected by {CAPTCHA_CONFIG.own === 1 ? 'asprin captcha' : 'reCAPTCHA v3'}
                    </p>
                    <p className="mt-3 text-sm text-zinc-500">
                        made by{' '}
                        <a
                            href="https://t.me/happySaturday_bitch"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-white transition-colors underline decoration-zinc-700 hover:decoration-white underline-offset-4"
                        >
                            asprin dev
                        </a>
                        {' '}- version 4 captcha {CAPTCHA_CONFIG.own === 1 ? 'own hosted' : 'google recaptcha v3'}
                    </p>
                </div>
            </div>
        </div>
    );
}
