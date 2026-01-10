"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle, ExternalLink, Timer, Lock } from "lucide-react";

export default function V5ResolvePage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const [status, setStatus] = useState<'waiting' | 'verifying' | 'redirecting' | 'error'>('waiting');
    const [timeLeft, setTimeLeft] = useState(5);
    const [error, setError] = useState('');
    const [canProceed, setCanProceed] = useState(false);

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanProceed(true);
        }
    }, [timeLeft]);

    const handleGetLink = async () => {
        try {
            setStatus('verifying');
            const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

            let captchaToken = 'development-bypass';

            if (siteKey) {
                // Load reCAPTCHA script if needed
                if (!(window as any).grecaptcha) {
                    const script = document.createElement('script');
                    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
                    document.head.appendChild(script);
                    await new Promise((resolve) => {
                        script.onload = resolve;
                    });
                }

                await new Promise<void>(resolve => {
                    (window as any).grecaptcha.ready(async () => {
                        captchaToken = await (window as any).grecaptcha.execute(siteKey, { action: 'resolve_v5' });
                        resolve();
                    });
                });
            }

            const response = await fetch('/api/v5/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, captchaToken }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Verification failed. Please try again.');
                setStatus('error');
                return;
            }

            setStatus('redirecting');
            window.location.href = data.url;

        } catch (err: any) {
            console.error('Resolve error:', err);
            setError(err.message || 'An error occurred. Please try again.');
            setStatus('error');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-black text-white p-6">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-800 via-white/20 to-zinc-800"></div>

                <div className="text-center mb-8">
                    <div className="inline-flex p-3 rounded-full bg-zinc-800/50 border border-white/5 mb-4">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight mb-2">Security Verification</h1>
                    <p className="text-zinc-500 text-sm">Protecting the link from automated bypass bots</p>
                </div>

                {status === 'waiting' && (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="relative flex items-center justify-center">
                                <svg className="w-24 h-24 transform -rotate-90">
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="40"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="transparent"
                                        className="text-zinc-800"
                                    />
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="40"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="transparent"
                                        strokeDasharray={2 * Math.PI * 40}
                                        strokeDashoffset={2 * Math.PI * 40 * (1 - timeLeft / 5)}
                                        className="text-white transition-all duration-1000 ease-linear"
                                    />
                                </svg>
                                <span className="absolute text-2xl font-mono font-bold">{timeLeft}</span>
                            </div>
                            <p className="mt-4 text-zinc-400 text-sm flex items-center gap-2">
                                <Timer className="w-4 h-4" /> Please wait a moment...
                            </p>
                        </div>

                        <button
                            onClick={handleGetLink}
                            disabled={!canProceed}
                            className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${canProceed
                                    ? 'bg-white text-black hover:bg-zinc-200 active:scale-95 shadow-lg shadow-white/5'
                                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                }`}
                        >
                            {canProceed ? (
                                <>Get Link <ExternalLink className="w-5 h-5" /></>
                            ) : (
                                <>Wait {timeLeft}s <Lock className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                )}

                {(status === 'verifying' || status === 'redirecting') && (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/10 border-t-white mx-auto mb-6"></div>
                        <h2 className="text-xl font-semibold mb-2">
                            {status === 'verifying' ? 'Verifying Security...' : 'Redirecting...'}
                        </h2>
                        <p className="text-sm text-zinc-500">
                            {status === 'verifying' ? 'Validating your request with reCAPTCHA v3' : 'Taking you to your destination'}
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center py-6">
                        <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
                        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 mb-6">
                            <p className="text-sm text-red-400 leading-relaxed">{error}</p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all font-medium border border-white/5"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-zinc-800/50 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium mb-1">Protected By</p>
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-xs text-zinc-500 font-mono">IP PINNING</span>
                        <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
                        <span className="text-xs text-zinc-500 font-mono">RECAPTCHA V3</span>
                    </div>
                    <p className="mt-6 text-xs text-zinc-500">
                        © {new Date().getFullYear()} links.asprin.dev • <span className="text-zinc-700">v5.1 Secure</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
