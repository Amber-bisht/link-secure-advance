"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Loader2, RefreshCw, X, ShieldCheck, CheckCircle2, RotateCw, Type, Eye } from "lucide-react";
import { solvePoW } from "@/utils/pow";

const CAPTCHA_API_BASE = process.env.NEXT_PUBLIC_CUSTOM_CAPTCHA_API || "https://captcha-p.asprin.dev/api/image";

interface CaptchaChallenge {
    id: string;
    type: 'text' | 'spatial' | 'image';
    question?: string;
    image?: string; // Base64 for text challenge
    spriteSheet?: string; // Base64 for spatial
    totalFrames?: number;
    startFrame?: number;
    images?: Array<{ id: string, url: string }>; // For legacy image challenges
    token: string;
}

interface ImageCaptchaModalProps {
    isOpen: boolean;
    onVerified: (token: string) => void;
    onClose: () => void;
    onError: (error: string) => void;
}

export default function ImageCaptchaModal({
    isOpen,
    onVerified,
    onClose,
    onError,
}: ImageCaptchaModalProps) {
    const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State for different challenge types
    const [textAnswer, setTextAnswer] = useState("");
    const [currentFrame, setCurrentFrame] = useState(0);
    const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
    const [honeyPot, setHoneyPot] = useState("");

    // Tracking for behavior analysis
    const startTime = useRef<number>(0);
    const interactions = useRef<number>(0);

    const fetchChallenge = useCallback(async () => {
        setLoading(true);
        setError(null);
        setTextAnswer("");
        setSelectedImages(new Set());
        interactions.current = 0;

        try {
            // STEP 1: Get PoW Challenge
            const initRes = await fetch(`${CAPTCHA_API_BASE}/api/init`);
            const { nonce, difficulty } = await initRes.json();

            // STEP 2: Solve PoW
            const solution = await solvePoW(nonce, difficulty);

            // STEP 3: Request Actual Challenge
            const response = await fetch(`${CAPTCHA_API_BASE}/api/request-challenge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nonce, solution }),
            });

            if (!response.ok) throw new Error("Security challenge failed");

            const data = await response.json();
            setChallenge(data);
            if (data.type === 'spatial') {
                setCurrentFrame(data.startFrame || 0);
            }
            startTime.current = Date.now();
        } catch (err: any) {
            setError(err.message || "Failed to load captcha");
            onError(err.message || "Failed to load captcha");
        } finally {
            setLoading(false);
        }
    }, [onError]);

    useEffect(() => {
        if (isOpen) fetchChallenge();
    }, [isOpen, fetchChallenge]);

    const handleVerify = async () => {
        if (!challenge) return;

        setVerifying(true);
        setError(null);

        try {
            const body: any = {
                sessionId: challenge.id,
                token: challenge.token,
                honeyPot: honeyPot, // Bot bait
            };

            if (challenge.type === 'text') body.textAnswer = textAnswer;
            if (challenge.type === 'spatial') body.targetFrame = currentFrame;
            if (challenge.type === 'image') body.selectedImages = Array.from(selectedImages);

            const response = await fetch(`${CAPTCHA_API_BASE}/api/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.success && data.token) {
                onVerified(data.token);
            } else {
                setError(data.message || "Verification failed");
                await fetchChallenge();
            }
        } catch (err: any) {
            setError("Connection error");
        } finally {
            setVerifying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="relative w-full max-w-sm mx-4 bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden p-6">

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                        <ShieldCheck className="text-purple-400 w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Human Defense</h3>
                    <p className="text-zinc-500 text-xs mt-1">Complete the task to proceed</p>
                </div>

                {/* Honeypot Field (Invisible to Humans) */}
                <input
                    type="text"
                    value={honeyPot}
                    onChange={(e) => setHoneyPot(e.target.value)}
                    className="absolute opacity-0 pointer-events-none"
                    tabIndex={-1}
                    autoComplete="off"
                />

                <div className="min-h-[220px] flex flex-col justify-center">
                    {loading ? (
                        <div className="flex flex-col items-center py-8">
                            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                            <p className="text-zinc-400 text-sm animate-pulse">Running security checks...</p>
                        </div>
                    ) : (
                        <>
                            {challenge?.type === 'text' && (
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <img src={challenge.image} alt="Captcha" className="rounded-xl border border-zinc-800 w-full" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Type the characters"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                        value={textAnswer}
                                        onChange={(e) => setTextAnswer(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                                    />
                                </div>
                            )}

                            {challenge?.type === 'spatial' && (
                                <div className="space-y-6 text-center">
                                    <p className="text-sm text-zinc-300">Rotate the object until it is <span className="text-purple-400 font-bold">upright</span></p>
                                    <div className="relative w-36 h-36 mx-auto bg-zinc-900 rounded-full border border-zinc-800 flex items-center justify-center overflow-hidden">
                                        <div
                                            className="w-[150px] h-[150px] pointer-events-none"
                                            style={{
                                                backgroundImage: `url(${challenge.spriteSheet})`,
                                                backgroundPosition: `-${(currentFrame % 6) * 150}px -${Math.floor(currentFrame / 6) * 150}px`,
                                                backgroundSize: '900px 900px'
                                            }}
                                        />
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="35"
                                        step="1"
                                        value={currentFrame}
                                        onChange={(e) => {
                                            setCurrentFrame(parseInt(e.target.value));
                                            interactions.current++;
                                        }}
                                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                    />
                                </div>
                            )}

                            {error && (
                                <p className="text-red-400 text-xs text-center mt-4 bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                                    {error}
                                </p>
                            )}

                            <button
                                onClick={handleVerify}
                                disabled={verifying || (challenge?.type === 'text' && !textAnswer)}
                                className="w-full mt-6 py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                {verifying ? <Loader2 className="animate-spin w-5 h-5" /> : "Verify Identity"}
                            </button>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-zinc-900/50 flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-600">
                    <span>V3.0 Hybrid</span>
                    <button onClick={fetchChallenge} className="hover:text-purple-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                </div>
            </div>
        </div>
    );
}
