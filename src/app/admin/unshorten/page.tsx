
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Shield,
    Link as LinkIcon,
    ArrowRight,
    Unlock,
    Copy,
    Check,
    AlertCircle,
    Search
} from "lucide-react";

export default function UnshortenPage() {
    const { data: session, status: authStatus } = useSession();
    const [url, setUrl] = useState("");
    const [result, setResult] = useState<{ originalUrl: string, version: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Simple client-side auth redirection if needed, 
        // usually middleware or layout handles protection but redundant check is fine
    }, [authStatus, session]);

    const handleUnshorten = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setResult(null);
        setLoading(true);

        try {
            const res = await fetch("/api/admin/unshorten", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to unshorten link");
            }

            setResult({
                originalUrl: data.originalUrl,
                version: data.version
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (result?.originalUrl) {
            navigator.clipboard.writeText(result.originalUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (authStatus === "loading") return null;

    if (session?.user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6">
                    <Shield className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-zinc-500 max-w-md">
                    This tool is restricted to administrators only.
                </p>
                <button
                    onClick={() => window.location.href = "/"}
                    className="mt-8 px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 rounded-xl transition-all"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-xl">
                        <Unlock className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Link Unshortener</h1>
                        <p className="text-zinc-500">Decrypt and analyze shortened links</p>
                    </div>
                </div>

                {/* Input Card */}
                <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 backdrop-blur-sm mb-8">
                    <form onSubmit={handleUnshorten} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Shortened URL
                            </label>
                            <div className="relative">
                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                                <input
                                    type="text"
                                    placeholder="https://links.asprin.dev/v4/..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !url}
                            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    Decrypting...
                                </>
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    Unshorten Link
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Error State */}
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 mb-8 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Result State */}
                {result && (
                    <div className="bg-zinc-900/30 border border-emerald-500/20 rounded-2xl p-1 overflow-hidden animate-in fade-in slide-in-from-top-4">
                        <div className="bg-emerald-500/5 p-6 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium uppercase tracking-wider">
                                    <Check className="w-4 h-4" />
                                    Decryption Successful
                                </div>
                                <div className="px-3 py-1 bg-black/40 rounded-full border border-white/5 text-xs text-zinc-400">
                                    {result.version}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Original Destination</h3>
                                    <div className="relative group">
                                        <div className="p-4 bg-black/60 border border-white/10 rounded-xl break-all pr-12 font-mono text-sm text-zinc-300">
                                            {result.originalUrl}
                                        </div>
                                        <button
                                            onClick={copyToClipboard}
                                            className="absolute right-2 top-2 p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Copy to clipboard"
                                        >
                                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <a
                                        href={result.originalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Visit URL <ArrowRight className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
