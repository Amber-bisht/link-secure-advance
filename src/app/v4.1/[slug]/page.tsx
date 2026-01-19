"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

export default function V41RedirectPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const slug = params.slug as string;

    // Check for callback params
    const token = searchParams.get('token');
    const verified = searchParams.get('verified');

    const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
    const [error, setError] = useState('');

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

    useEffect(() => {
        const initVisit = async () => {
            try {
                setStatus('loading');
                const { visitNumber } = getVisitStatus();

                const res = await fetch('/api/v4.1/visit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slug,
                        token: token || undefined,
                        verified: verified === 'true',
                        visitNumber
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Connection failed');
                }

                if (data.action === 'shorten') {
                    updateVisitStatus('shorten');
                    // Redirect to LinkShortify/Others
                    window.location.href = data.url;
                    return;
                }

                if (data.action === 'redirect') {
                    // Success - Final Destination
                    setStatus('success');
                    window.location.href = data.url;
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

        if (slug) {
            initVisit();
        }
    }, [slug, token, verified, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-black">
            <div className="max-w-md w-full p-8 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-zinc-800/50 border border-white/5">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">links.asprin.dev</h1>
                    <p className="text-xs text-zinc-500">Secure Link v4.1</p>
                </div>

                {status === 'loading' && (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/10 border-t-white mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            Connecting...
                        </h2>
                        <p className="text-sm text-zinc-400">
                            Establishing secure session
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="w-12 h-12 text-green-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            Session Active
                        </h2>
                        <p className="text-sm text-zinc-400">
                            Redirecting to destination...
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <AlertCircle className="w-12 h-12 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-red-500 mb-2">
                            Access Denied
                        </h2>
                        <p className="text-sm text-red-400 mb-6 px-4">
                            {error}
                        </p>
                        <button
                            onClick={() => {
                                // Clear params and reload to try again (new session)
                                router.push(`/v4.1/${slug}`);
                            }}
                            className="px-6 py-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl transition-all w-full font-medium"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <p className="text-xs text-zinc-600">
                        Secure Link v4.1
                    </p>
                </div>
            </div>
        </div>
    );
}
