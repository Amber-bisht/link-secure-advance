"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, RefreshCw, X, ShieldCheck, CheckCircle2 } from "lucide-react";

const CAPTCHA_API_BASE = process.env.NEXT_PUBLIC_CUSTOM_CAPTCHA_API || "https://captcha-p.asprin.dev/api/image";

interface CaptchaImage {
    id: string;
    url: string;
}

interface CaptchaChallenge {
    success: boolean;
    sessionId: string;
    question: string;
    images: CaptchaImage[];
    token: string;
    csrfToken: string;
    expiresIn: number;
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
    const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchChallenge = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSelectedImages(new Set());

        try {
            const response = await fetch(`${CAPTCHA_API_BASE}/api/captcha`, {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to load security challenge");
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to load challenge");
            }

            setChallenge(data);
        } catch (err: any) {
            setError(err.message || "Failed to load captcha");
            onError(err.message || "Failed to load captcha");
        } finally {
            setLoading(false);
        }
    }, [onError]);

    useEffect(() => {
        if (isOpen) {
            fetchChallenge();
        }
    }, [isOpen, fetchChallenge]);

    const toggleImage = (imageId: string) => {
        setSelectedImages((prev: Set<string>) => {
            const next = new Set(prev);
            if (next.has(imageId)) {
                next.delete(imageId);
            } else {
                next.add(imageId);
            }
            return next;
        });
    };

    const handleVerify = async () => {
        if (!challenge || selectedImages.size === 0) {
            setError("Please select at least one image");
            return;
        }

        setVerifying(true);
        setError(null);

        try {
            const response = await fetch(`${CAPTCHA_API_BASE}/api/verify`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sessionId: challenge.sessionId,
                    selectedImages: Array.from(selectedImages),
                    token: challenge.token,
                }),
            });

            const data = await response.json();

            if (data.success && data.token) {
                onVerified(data.token);
            } else {
                setError(data.message || "Verification failed. Please try again.");
                // Refresh challenge on failure
                await fetchChallenge();
            }
        } catch (err: any) {
            setError(err.message || "Verification failed");
            onError(err.message || "Verification failed");
        } finally {
            setVerifying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <ShieldCheck className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">Security Verification</h3>
                            <p className="text-xs text-zinc-500">Complete the challenge to continue</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
                            <p className="text-sm text-zinc-400">Loading challenge...</p>
                        </div>
                    ) : error && !challenge ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-red-400 mb-4">{error}</p>
                            <button
                                onClick={fetchChallenge}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                        </div>
                    ) : challenge ? (
                        <>
                            {/* Question */}
                            <div className="text-center mb-4">
                                <p className="text-white font-medium">{challenge.question}</p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Click on all matching images
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-400 text-center">{error}</p>
                                </div>
                            )}

                            {/* Image Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {challenge.images.map((image) => (
                                    <button
                                        key={image.id}
                                        onClick={() => toggleImage(image.id)}
                                        disabled={verifying}
                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedImages.has(image.id)
                                            ? "border-purple-500 ring-2 ring-purple-500/30"
                                            : "border-zinc-700 hover:border-zinc-600"
                                            } ${verifying ? "opacity-50 cursor-not-allowed" : ""}`}
                                    >
                                        <Image
                                            src={`${CAPTCHA_API_BASE}/api/image/${image.id}`}
                                            alt="Captcha image"
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                        {selectedImages.has(image.id) && (
                                            <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                                <CheckCircle2 className="w-8 h-8 text-purple-400" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={fetchChallenge}
                                    disabled={verifying}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleVerify}
                                    disabled={verifying || selectedImages.size === 0}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {verifying ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        "Verify"
                                    )}
                                </button>
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/50">
                    <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest">
                        Protected by Asprin CAPTCHA
                    </p>
                </div>
            </div>
        </div>
    );
}
