"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useRef } from "react";
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Script from "next/script";
import dynamic from "next/dynamic";
import { fetchChallenge, prepareChallengeData } from "@/utils/clientChallenge";
import type { Challenge } from "@/utils/clientChallenge";
import { initAntiInspect } from "@/utils/antiDebugging";
import { CAPTCHA_CONFIG } from "@/config/captcha";

// Dynamic import for the image captcha modal
const ImageCaptchaModal = dynamic(() => import("@/components/ImageCaptchaModal"), {
    ssr: false,
    loading: () => null,
});

interface RedirectClientProps {
    slug: string;
    urls: string[]; // Kept for legacy fallback
}

export default function RedirectClient({ slug, urls }: RedirectClientProps) {
    // Steps: 1=Checking, 2=Security, 3=Session, 4=Redirect
    const [step, setStep] = useState(1);
    const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
    const [error, setError] = useState('');
    const [challenge, setChallenge] = useState<Challenge | null>(null);

    // Image captcha modal state (for own === 1)
    const [showImageCaptcha, setShowImageCaptcha] = useState(false);

    // Trap Loading State
    const [trapLoaded, setTrapLoaded] = useState(false);
    const trapLoadedRef = useRef(false);

    // Turnstile ref (for V4 Turnstile mode)
    const turnstileContainerRef = useRef<HTMLDivElement>(null);

    // Get Visit Count and Update LocalStorage
    const getVisitCount = () => {
        try {
            const storageKey = `v4.1_visit_${slug}`;
            const now = new Date();
            // Get IST Date String (YYYY-MM-DD)
            const istDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

            const stored = localStorage.getItem(storageKey);
            let data = stored ? JSON.parse(stored) : { date: istDate, count: 0 };

            // Check Reset (12:00 AM IST effectively changes the date string)
            if (data.date !== istDate) {
                console.log("Date changed (IST), resetting count.");
                data = {
                    date: istDate,
                    count: 0
                };
            }

            // Increment
            data.count += 1;
            localStorage.setItem(storageKey, JSON.stringify(data));
            return data.count;

        } catch (e) {
            console.error("LocalStorage error", e);
            return 1; // Default to 1st
        }
    };

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
                await new Promise(resolve => setTimeout(resolve, 1500)); // Increased UX delay

                // Step 2: Security
                setStep(2);
                await new Promise(resolve => setTimeout(resolve, 1500)); // Increased UX delay

                // Check if CAPTCHA is configured
                const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

                if (!siteKey) {
                    console.warn('⚠️ CAPTCHA not configured - using development mode');
                    await submitVerification('development-bypass');
                    return;
                }

                // Turnstile (own === 2)
                if (CAPTCHA_CONFIG.own === 2) {
                    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
                        setError('Turnstile configuration missing');
                        setStatus('error');
                        return;
                    }
                    // The Script component in return() will handle loading and triggering render
                    return;
                }

                let token = '';

                // Custom Image Captcha (own === 1)
                if (CAPTCHA_CONFIG.own === 1) {
                    // Show the image captcha modal
                    setShowImageCaptcha(true);
                    // The modal will handle verification and call submitVerification
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
    }, [slug]);

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

            // Ensure Resource Trap is loaded (for Cloudflare mode)
            // Ensure Resource Trap is loaded (for Cloudflare mode)
            if (CAPTCHA_CONFIG.own === 2) {
                if (!trapLoadedRef.current) {
                    // Wait for trap to load (max 3s)
                    for (let i = 0; i < 30; i++) {
                        if (trapLoadedRef.current) break;
                        await new Promise(r => setTimeout(r, 100));
                    }
                }
            }

            const visitCount = getVisitCount();

            const res = await fetch('/api/v4.1/redirect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Proof': challengeData.proof
                },
                body: JSON.stringify({
                    slug,
                    captchaToken,
                    visitCount,
                    challenge_id: challengeData.challenge_id,
                    timing: challengeData.timing,
                    entropy: challengeData.entropy,
                    counter: challengeData.counter
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error) throw new Error(data.error);
                throw new Error("Verification failed");
            }

            // Step 4: Redirect
            setStep(4);
            setStatus('success');
            setTimeout(() => {
                window.location.replace(data.url);
            }, 800);

        } catch (err: any) {
            console.error("Verification Error:", err);
            setError(err.message || "Security check failed");
            setStatus('error');
        }
    };

    const handleTurnstileLoad = () => {
        if (CAPTCHA_CONFIG.own === 2 && (window as any).turnstile && turnstileContainerRef.current) {
            try {
                (window as any).turnstile.render(turnstileContainerRef.current, {
                    sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
                    theme: 'dark',
                    callback: (token: string) => submitVerification(token),
                    'error-callback': () => {
                        setError('Security verification failed');
                        setStatus('error');
                    },
                });
            } catch (e) { console.error(e); }
        }
    };

    // Handler for image captcha verification
    const handleImageCaptchaVerified = async (token: string) => {
        setShowImageCaptcha(false);
        await submitVerification(token);
    };

    const handleImageCaptchaClose = () => {
        setShowImageCaptcha(false);
        setError('Verification cancelled');
        setStatus('error');
    };

    const handleImageCaptchaError = (errorMsg: string) => {
        setShowImageCaptcha(false);
        setError(errorMsg);
        setStatus('error');
    };

    const timeline = [
        { step: 1, label: "Checking Link Status" },
        { step: 2, label: "Verifying Security Scope" },
        { step: 3, label: "Establishing Secure Session" },
        { step: 4, label: "Redirecting to Destination" },
    ];

    return (
        <div className="flex min-h-screen items-center justify-center bg-black font-sans selection:bg-purple-500/30">
            {/* Image CAPTCHA Modal (own === 1) */}
            {CAPTCHA_CONFIG.own === 1 && (
                <ImageCaptchaModal
                    isOpen={showImageCaptcha}
                    onVerified={handleImageCaptchaVerified}
                    onClose={handleImageCaptchaClose}
                    onError={handleImageCaptchaError}
                />
            )}

            {/* Scripts */}
            {CAPTCHA_CONFIG.own === 2 && (
                <Script
                    src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                    onLoad={handleTurnstileLoad}
                    strategy="afterInteractive"
                    referrerPolicy="strict-origin-when-cross-origin"
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

                {/* Turnstile Container (Visible for Interaction) */}
                <div className="flex justify-center mb-6 min-h-[65px]">
                    <div ref={turnstileContainerRef} />
                </div>

                {/* Resource Trap & Honeypot (Cloudflare Mode Only) */}
                {CAPTCHA_CONFIG.own === 2 && (
                    <>
                        {/* Resource Trap */}
                        <img
                            src="/api/trap/image"
                            alt=""
                            className="absolute opacity-0 w-px h-px pointer-events-none"
                            aria-hidden="true"
                            onLoad={() => {
                                setTrapLoaded(true);
                                trapLoadedRef.current = true;
                            }}
                            onError={() => {
                                setTrapLoaded(true);
                                trapLoadedRef.current = true;
                            }}
                        />

                        {/* Honeypot */}
                        <a
                            href="/api/trap/bot"
                            className="absolute opacity-0 w-px h-px pointer-events-none top-0 left-0 overflow-hidden"
                            tabIndex={-1}
                            aria-hidden="true"
                            rel="nofollow"
                        >
                            Skip Verification
                        </a>
                    </>
                )}


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
                        Secured by Asprin V4.1
                    </p>
                </div>
            </div>
        </div>
    );
}
