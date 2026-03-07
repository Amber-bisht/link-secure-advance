"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShieldCheck, Target, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { fetchChallenge, prepareChallengeData, encryptPayload } from "@/utils/clientChallenge";
import type { Challenge } from "@/utils/clientChallenge";
import { initAntiInspect } from "@/utils/antiDebugging";

const ArcheryCaptcha = dynamic(() => import("@/components/ArcheryCaptcha"), {
    ssr: false,
    loading: () => null,
});

export default function V5RedirectPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [step, setStep] = useState(1);
    const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
    const [error, setError] = useState('');
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [showCaptcha, setShowCaptcha] = useState(false);

    useEffect(() => {
        initAntiInspect();
        const startVerification = async () => {
            try {
                const challengeData = await fetchChallenge();
                if (!challengeData) throw new Error('Failed to obtain security challenge');
                setChallenge(challengeData);

                setStep(1);
                await new Promise(resolve => setTimeout(resolve, 1000));

                setStep(2);
                setShowCaptcha(true);
            } catch (err: any) {
                setError(err.message || 'Verification initialization failed');
                setStatus('error');
            }
        };

        if (slug) startVerification();
    }, [slug]);

    const handleVerified = async (token: string) => {
        setShowCaptcha(false);
        setStep(3);
        setStatus('processing');

        try {
            if (!challenge) throw new Error('Security challenge unavailable');

            const challengeData = await prepareChallengeData(challenge);
            if (!challengeData) throw new Error('Failed to prepare payload');

            const payload = {
                slug,
                captchaToken: token,
                challenge_id: challengeData.challenge_id,
                timing: challengeData.timing,
                entropy: challengeData.entropy,
                counter: challengeData.counter
            };

            const encryptedData = await encryptPayload(payload, challenge.nonce);

            const response = await fetch('/api/v5/redirect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Proof': challengeData.proof
                },
                body: JSON.stringify({
                    challenge_id: challengeData.challenge_id,
                    encrypted: encryptedData.encrypted,
                    iv: encryptedData.iv
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Verification failed');

            setStep(4);
            setStatus('success');
            setTimeout(() => {
                window.location.href = data.url;
            }, 800);

        } catch (err: any) {
            setError(err.message || 'Redirect failed');
            setStatus('error');
        }
    };

    const timeline = [
        { step: 1, label: "Analyzing Environment" },
        { step: 2, label: "Skill-based Verification" },
        { step: 3, label: "Syncing Secure Tunnel" },
        { step: 4, label: "Accessing Destination" },
    ];

    return (
        <div className="flex min-h-screen items-center justify-center bg-black selection:bg-purple-500/30 font-sans">
            <ArcheryCaptcha
                isOpen={showCaptcha}
                onVerified={handleVerified}
                onClose={() => { setError('Verification cancelled'); setStatus('error'); }}
                onError={(msg) => { setError(msg); setStatus('error'); }}
                challengeNonce={challenge?.nonce}
            />

            <div className="max-w-md w-full p-8 bg-zinc-900/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                {/* Ambient Glow */}
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="text-center mb-12 relative z-10">
                    <div className="flex justify-center mb-8">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/40 transition-all opacity-0 group-hover:opacity-100" />
                            <div className="p-5 rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl relative">
                                <ShieldCheck className="w-12 h-12 text-white" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tighter">V5 Protocol</h1>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold opacity-60">Secure Link Gateway</p>
                </div>

                <div className="relative z-10 space-y-8">
                    {status === 'error' ? (
                        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-4 rounded-full bg-red-500/10 w-fit mx-auto mb-6">
                                <AlertCircle className="w-12 h-12 text-red-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Gate Blocked</h2>
                            <p className="text-sm text-zinc-400 mb-8 max-w-[250px] mx-auto leading-relaxed">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-zinc-200 transition-all active:scale-[0.98]"
                            >
                                Re-verify Identity
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {timeline.map((item) => {
                                const isActive = step === item.step;
                                const isCompleted = step > item.step;
                                const isPending = step < item.step;

                                return (
                                    <div key={item.step} className={`flex items-center gap-5 transition-all duration-700 ${isPending ? 'opacity-20 translate-x-4' : 'opacity-100'}`}>
                                        <div className={`
                                            w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-700
                                            ${isCompleted ? 'bg-white border-white scale-90' : ''}
                                            ${isActive ? 'bg-transparent border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : ''}
                                            ${isPending ? 'bg-transparent border-zinc-800' : ''}
                                        `}>
                                            {isCompleted ? <CheckCircle2 className="w-6 h-6 text-black" /> :
                                                isActive ? <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" /> :
                                                    <span className="text-xs font-bold text-zinc-700">{item.step}</span>}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-bold tracking-tight transition-colors duration-500 ${isActive || isCompleted ? 'text-white' : 'text-zinc-600'}`}>
                                                {item.label}
                                            </p>
                                            {isActive && (
                                                <div className="h-1 bg-zinc-800 w-full mt-2 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 animate-progress" style={{ width: '100%' }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-16 text-center pt-8 border-t border-white/5 opacity-40">
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">
                        Encryption Standard v5.0
                    </p>
                </div>
            </div>

            <style jsx>{`
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(0); }
                }
                .animate-progress {
                    animation: progress 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
