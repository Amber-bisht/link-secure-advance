"use client";

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @next/next/no-html-link-for-pages */


import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import Script from "next/script";
import { CAPTCHA_CONFIG } from "@/config/captcha";
import { fetchChallenge, prepareChallengeData, type Challenge } from "@/utils/clientChallenge";
import { initAntiInspect } from "@/utils/antiDebugging";

export default function V41RedirectPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const slug = params.slug as string;

    // Check for callback params
    const token = searchParams.get('token');
    const verified = searchParams.get('verified');

    // Status & Timeline State
    // Steps: 1=Checking, 2=Security, 3=Session, 4=Redirect
    const [step, setStep] = useState(1);
    const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
    const [error, setError] = useState('');
    const [challenge, setChallenge] = useState<Challenge | null>(null);

    // Turnstile ref
    const turnstileContainerRef = useRef<HTMLDivElement>(null);

    // Trap Loading State
    const [trapLoaded, setTrapLoaded] = useState(false);

    useEffect(() => {
        initAntiInspect();
    }, []);

    const getVisitStatus = () => {
        try {
            const now = new Date();
            // Get IST Date String (e.g., "1/19/2026")
            const istDate = now.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" });
            const stored = localStorage.getItem('v4_visit_data');
            let data = stored ? JSON.parse(stored) : null;

            if (!data || data.date !== istDate) {
                // Reset or Init for new day (IST)
                data = {
                    date: istDate,
                    count: 0,
                    lastVisit: 0
                };
            }

            // Logic:
            // If data.lastVisit is recent (< 3 mins), we consider this a refresh/continuation of the CURRENT count.
            // If data.lastVisit is old (> 3 mins), we consider this a NEW visit attempt (count + 1).

            const lastVisitTime = data.lastVisit || 0;
            const diff = now.getTime() - lastVisitTime;
            const buffer = 3 * 60 * 1000; // 3 minutes

            // If it's the very first visit (count 0), we want visitNumber 1.
            // If we have count 1 and inside buffer, we want visitNumber 1.
            // If we have count 1 and outside buffer, we want visitNumber 2.

            let visitNumber = data.count + 1;
            if (data.count > 0 && diff < buffer) {
                visitNumber = data.count;
            }

            return { visitNumber, data };
        } catch (e) {
            console.error("Visit status error", e);
            return { visitNumber: 1, data: null }; // Fallback
        }
    };

    const updateVisitStatus = (serverAction: string) => {
        if (serverAction !== 'shorten') return;
        try {
            const now = new Date();
            const istDate = now.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" });
            const stored = localStorage.getItem('v4_visit_data');
            let data = stored ? JSON.parse(stored) : { date: istDate, count: 0, lastVisit: 0 };

            // Logic matching getVisitStatus:
            // If we completed a visit 1, and we were "outside buffer" (so it was a new visit), we increment count.
            // IF we were "inside buffer", we DON'T increment count (it was a replay).

            const lastVisitTime = data.lastVisit || 0;
            const diff = now.getTime() - lastVisitTime;
            const buffer = 3 * 60 * 1000;

            if (data.date !== istDate) {
                // Should have been reset by getVisitStatus, but safe measure
                data = { date: istDate, count: 1, lastVisit: now.getTime() };
            } else {
                if (data.count === 0 || diff > buffer) {
                    data.count += 1;
                }
                data.lastVisit = now.getTime();
            }

            localStorage.setItem('v4_visit_data', JSON.stringify(data));
        } catch (e) {
            console.error("Update status error", e);
        }
    };

    const initVisit = async (turnstileToken: string) => {
        try {
            setStep(3); // Establishing Session
            const { visitNumber } = getVisitStatus();

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
            if (CAPTCHA_CONFIG.own === 2 && !trapLoaded) {
                // Wait for trap to load (max 3s)
                for (let i = 0; i < 30; i++) {
                    if (trapLoaded) break;
                    await new Promise(r => setTimeout(r, 100));
                }
            }

            const res = await fetch('/api/v4.1/visit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Proof': challengeData.proof
                },
                body: JSON.stringify({
                    slug,
                    token: token || undefined,
                    verified: verified === 'true',
                    visitNumber,
                    turnstileToken,
                    challenge_id: challengeData.challenge_id,
                    timing: challengeData.timing,
                    entropy: challengeData.entropy,
                    counter: challengeData.counter
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Connection failed');
            }

            if (data.action === 'shorten') {
                updateVisitStatus('shorten');
                setStep(4); // Redirecting
                setStatus('success');
                // Redirect to LinkShortify/Others
                setTimeout(() => {
                    window.location.href = data.url;
                }, 800);
                return;
            }

            if (data.action === 'redirect') {
                // Success - Final Destination
                updateVisitStatus('redirect'); // Update last visit time? Maybe not needed for final dest
                setStep(4); // Redirecting
                setStatus('success');
                setTimeout(() => {
                    window.location.href = data.url;
                }, 800);
                return;
            }

            if (data.action === 'error_bot') {
                setError(data.error);
                setStatus('error');
                return;
            }

        } catch (err: any) {
            console.error('Visit error:', err);
            setError(err.message || 'Failed to process link');
            setStatus('error');
        }
    };

    // Fetch challenge and render Turnstile when script loads
    const handleScriptLoad = async () => {
        // Fetch challenge first
        const challengeData = await fetchChallenge();
        if (!challengeData) {
            setError('Failed to obtain security challenge');
            setStatus('error');
            return;
        }
        setChallenge(challengeData);

        // Step 1: Small UX delay
        setStep(1);
        await new Promise(resolve => setTimeout(resolve, 1500));

        setStep(2); // Script loaded, waiting for widget/token
        await new Promise(resolve => setTimeout(resolve, 1500));

        if ((window as any).turnstile) {
            (window as any).turnstile.render(turnstileContainerRef.current, {
                sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, // Access from .env
                callback: (token: string) => {
                    initVisit(token);
                },
                'error-callback': () => {
                    setError('Security verification failed');
                    setStatus('error');
                },
                appearance: 'interaction-only',
            });
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
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                onLoad={handleScriptLoad}
                strategy="afterInteractive"
                referrerPolicy="strict-origin-when-cross-origin"
            />

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

                {/* Turnstile Container (Invisible) */}
                <div ref={turnstileContainerRef} className="fixed bottom-4 right-4 opacity-0 pointer-events-none" />

                {/* Resource Trap & Honeypot (Cloudflare Mode Only) */}
                {CAPTCHA_CONFIG.own === 2 && (
                    <>
                        {/* Resource Trap: Loads a 1x1 image to set a proof cookie. */}
                        <img
                            src="/api/trap/image"
                            alt=""
                            className="absolute opacity-0 w-px h-px pointer-events-none"
                            aria-hidden="true"
                            onLoad={() => setTrapLoaded(true)}
                            onError={() => setTrapLoaded(true)}
                        />

                        {/* Honeypot: Hidden link for bots to click. */}
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
