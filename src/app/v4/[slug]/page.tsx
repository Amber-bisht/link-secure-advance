"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { CAPTCHA_CONFIG } from "@/config/captcha";
import Script from "next/script";
import { fetchChallenge, prepareChallengeData } from "@/utils/clientChallenge";
import type { Challenge } from "@/utils/clientChallenge";
import { initAntiInspect } from "@/utils/antiDebugging";

export default function V4RedirectPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    // Steps: 1=Checking, 2=Security, 3=Session, 4=Redirect
    const [step, setStep] = useState(1);
    const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
    const [error, setError] = useState('');
    const [challenge, setChallenge] = useState<Challenge | null>(null);

    // Turnstile ref (for V4 Turnstile mode)
    // We use a div ID in V4 logic usually, but we can use ref if we change logic slightly.
    // However, existing V4 logic used ID '#turnstile-widget'. We can keep using ID for compatibility 
    // or switch to Ref. Ref is cleaner.
    const turnstileContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        initAntiInspect();
        const verifyAndRedirect = async () => {
            try {
                // Step 0: Fetch Challenge
                const challengeData = await fetchChallenge();
                if (!challengeData) {
                    throw new Error('Failed to obtain security challenge');
                }
                setChallenge(challengeData);

                // Step 1: Checking
                setStep(1);
                await new Promise(resolve => setTimeout(resolve, 800)); // Fake delay for UX

                // Step 2: Security
                setStep(2);

                // Check if CAPTCHA is configured
                const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

                if (!siteKey) {
                    console.warn('⚠️ CAPTCHA not configured - using development mode');
                    await submitVerification('development-bypass');
                    return;
                }

                // Turnstile (own === 2)
                if (CAPTCHA_CONFIG.own === 2) {
                    // Turnstile logic is handled by the Script onLoad and render function below
                    // We just wait here? 
                    // Actually, for V4 logic, we need to init the render.
                    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
                        setError('Turnstile configuration missing');
                        setStatus('error');
                        return;
                    }
                    // The Script component in return() will handle loading and triggering render
                    return;
                }

                let token = '';

                // Custom Captcha (own === 1)
                if (CAPTCHA_CONFIG.own === 1) {
                    if (!(window as any).CustomCaptchaV3) {
                        const script = document.createElement('script');
                        script.src = `https://captcha.asprin.dev/captcha-v3.js`;
                        script.onerror = () => { throw new Error('Failed to load security verification'); };
                        document.head.appendChild(script);
                        await new Promise((resolve, reject) => {
                            script.onload = resolve;
                            script.onerror = reject;
                        });
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000)); // UX delay
                    token = (window as any).CustomCaptchaV3.execute(slug, 'redirect');
                    await submitVerification(token);
                    return;
                }

                // Google ReCaptcha (own === 0)
                if (!(window as any).grecaptcha) {
                    const script = document.createElement('script');
                    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
                    script.onerror = () => { throw new Error('Failed to load security verification'); };
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
                        setTimeout(() => clearInterval(checkReady), 10000);
                    });
                }
                token = await (window as any).grecaptcha.execute(siteKey, { action: 'redirect' });
                await submitVerification(token);

            } catch (err: any) {
                console.error('Redirect error:', err);
                setError(err.message || 'An error occurred. Please try again.');
                setStatus('error');
            }
        };

        if (slug) {
            verifyAndRedirect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, router]);

    const submitVerification = async (captchaToken: string) => {
        // Step 3: Session
        setStep(3);

        try {
            // Prepare challenge data - fetch if not already available
            let currentChallenge = challenge;
            if (!currentChallenge) {
                currentChallenge = await fetchChallenge();
                if (currentChallenge) setChallenge(currentChallenge);
            }

            if (!currentChallenge) {
                throw new Error('Security challenge not available');
            }

            const challengeData = await prepareChallengeData(currentChallenge);
            if (!challengeData) {
                throw new Error('Failed to prepare security challenge');
            }

            const response = await fetch('/api/v4/redirect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Proof': challengeData.proof
                },
                body: JSON.stringify({
                    slug: slug,
                    captchaToken: captchaToken,
                    challenge_id: challengeData.challenge_id,
                    timing: challengeData.timing,
                    entropy: challengeData.entropy
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to verify. Please try again.');
                setStatus('error');
                return;
            }

            // Step 4: Redirect
            setStep(4);
            setStatus('success');

            setTimeout(() => {
                window.location.href = data.url;
            }, 800);

        } catch (err: any) {
            console.error('Submit error:', err);
            setError(err.message || 'Verification failed');
            setStatus('error');
        }
    };

    // Handler for Turnstile Script Load (Specific to V4 Page UI loop)
    const handleTurnstileLoad = () => {
        if (CAPTCHA_CONFIG.own === 2 && (window as any).turnstile) {
            try {
                // If we are in step 2 (Security), render
                // But we generally want to catch the ref
                if (turnstileContainerRef.current) {
                    (window as any).turnstile.render(turnstileContainerRef.current, {
                        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
                        theme: 'dark',
                        callback: async (token: string) => {
                            await submitVerification(token);
                        },
                        'error-callback': () => {
                            setError('Security verification failed');
                            setStatus('error');
                        },
                        // We use interaction-only or invisible? 
                        // V4.1 uses interaction-only with opacity-0 container. let's match that.
                    });
                }
            } catch (e) {
                console.error('Turnstile render error', e);
            }
        }
    };

    const timeline = [
        { step: 1, label: "Checking Link Status" },
        { step: 2, label: "Verifying Security Scope" },
        { step: 3, label: "Establishing Secure Session" },
        { step: 4, label: "Redirecting to Destination" },
    ];

    return (
        <div className="flex min-h-screen items-center justify-center bg-black font-sans selection:bg-purple-500/30">
            {/* Load Turnstile Script if needed */}
            {CAPTCHA_CONFIG.own === 2 && (
                <Script
                    src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                    onLoad={handleTurnstileLoad}
                    strategy="afterInteractive"
                />
            )}

            <div className="max-w-md w-full p-8 bg-zinc-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-800/50 relative overflow-hidden">

                {/* Background Ambient Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

                {/* Header */}
                <div className="text-center mb-10 relative z-10">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl relative group">
                            <div className="absolute inset-0 bg-purple-500/10 rounded-2xl blur-lg group-hover:bg-purple-500/20 transition-all opacity-0 group-hover:opacity-100" />
                            <ShieldCheck className="w-10 h-10 text-white relative z-10" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Accessing Secure Link</h1>
                    <p className="text-sm text-zinc-400">Please wait while we secure your connection.</p>
                </div>

                {/* Turnstile Container (Invisible/Hidden but functional) */}
                <div ref={turnstileContainerRef} className="fixed bottom-4 right-4 opacity-0 pointer-events-none" />

                <div className="relative z-10 space-y-1">
                    {status === 'error' ? (
                        <div className="text-center py-6">
                            <div className="flex justify-center mb-4">
                                <AlertCircle className="w-16 h-16 text-red-500 opacity-90" />
                            </div>
                            <h2 className="text-xl font-bold text-red-500 mb-3">
                                Access Denied
                            </h2>
                            <p className="text-sm text-red-400/80 mb-8 px-4 leading-relaxed">
                                {error}
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-4 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-bold rounded-xl transition-all active:scale-[0.98]"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        /* Timeline */
                        <div className="space-y-6 pl-4 relative">
                            {/* Connector Line */}
                            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-zinc-800" />

                            {timeline.map((item) => {
                                const isActive = step === item.step;
                                const isCompleted = step > item.step;
                                const isPending = step < item.step;

                                return (
                                    <div key={item.step} className={`relative flex items-center gap-4 transition-all duration-500 ${isPending ? 'opacity-30' : 'opacity-100'}`}>
                                        <div className={`
                                            relative z-10 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-500
                                            ${isCompleted ? 'bg-green-500 border-green-500 scale-100 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : ''}
                                            ${isActive ? 'bg-zinc-900 border-purple-500 scale-110 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : ''}
                                            ${isPending ? 'bg-zinc-900 border-zinc-800' : ''}
                                        `}>
                                            {isCompleted && <CheckCircle2 className="w-4 h-4 text-zinc-900" />}
                                            {isActive && <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium transition-colors duration-300 ${isActive || isCompleted ? 'text-white' : 'text-zinc-600'}`}>
                                                {item.label}
                                            </p>
                                            {isActive && (
                                                <p className="text-xs text-purple-400 mt-0.5 animate-pulse">Processing...</p>
                                            )}
                                        </div>
                                        {isActive && <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-10 text-center border-t border-white/5 pt-6">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
                        Secured by Asprin V4
                    </p>
                </div>
            </div>
        </div>
    );
}
