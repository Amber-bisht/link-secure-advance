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

    useEffect(() => {
        const initVisit = async () => {
            try {
                setStatus('loading');

                const res = await fetch('/api/v4.1/visit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slug,
                        token: token || undefined,
                        verified: verified === 'true'
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Connection failed');
                }

                if (data.action === 'shorten') {
                    // Redirect to LinkShortify
                    window.location.href = data.url;
                    return;
                }

                if (data.action === 'redirect') {
                    // Success - Final Destination
                    setStatus('success');
                    window.location.href = data.url;
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
                        <h2 className="text-xl font-semibold text-white mb-2">
                            Access Denied
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
                        Protected by LinkShortify Integration
                    </p>
                </div>
            </div>
        </div>
    );
}
