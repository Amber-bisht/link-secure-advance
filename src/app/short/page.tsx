"use client";

import { useState, useEffect } from "react";
import { encodeLink, encodeLinkV1, encodeLinkV2, encodeLinkV3 } from "@/utils/linkWrapper";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Copy, CheckCircle, ShieldCheck, Lock, Settings, LogOut, User as UserIcon } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

type Version = 'base' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5';
type Category = 'standard' | 'advanced';

const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
};

export default function ShortPage() {
    const { data: session, status } = useSession();
    const [url, setUrl] = useState("");
    const [customSlug, setCustomSlug] = useState(""); // For V5
    const [version, setVersion] = useState<Version>("base");
    const [category, setCategory] = useState<Category>("standard");
    const [generatedLink, setGeneratedLink] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    // V5 Specific State
    const [validUntil, setValidUntil] = useState<string | null>(null);
    const [isExpired, setIsExpired] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [savingKey, setSavingKey] = useState(false);
    const [hasKey, setHasKey] = useState<boolean | null>(null);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    // Fetch user status for V5
    useEffect(() => {
        if (session?.user) {
            fetch('/api/user/status').then(res => res.json()).then(data => {
                if (data.validUntil) {
                    setValidUntil(new Date(data.validUntil).toLocaleDateString());
                    setIsExpired(new Date(data.validUntil) < new Date());
                }
                setHasKey(data.hasKey);
            });
            // @ts-ignore
            setApiKeyInput(session.user.linkShortifyKey || '');
        }
    }, [session, category, version]);

    // Update version when category changes to ensure valid selection
    useEffect(() => {
        if (category === 'standard' && (version === 'v4' || version === 'v5')) {
            setVersion('base');
        } else if (category === 'advanced' && (version !== 'v4' && version !== 'v5')) {
            setVersion('v4');
        }
    }, [category]);

    const handleSaveKey = async () => {
        if (!apiKeyInput.trim()) return;
        setSavingKey(true);
        setSaveStatus(null);
        try {
            const res = await fetch('/api/user/update-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: apiKeyInput })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to save');

            setSaveStatus({ type: 'success', msg: 'Key verified and saved!' });
            setHasKey(true);

            // Wait a bit then close
            setTimeout(() => {
                setShowSettings(false);
                setSaveStatus(null);
            }, 2000);

        } catch (e: any) {
            setSaveStatus({ type: 'error', msg: e.message || 'Error saving key' });
        } finally {
            setSavingKey(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        setLoading(true);
        setError("");
        setGeneratedLink("");
        setCopied(false);

        // Basic validation
        let targetUrl = url;
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = "https://" + targetUrl;
        }

        try {
            // V5 Logic
            if (version === 'v5') {
                // @ts-ignore
                const userKey = session?.user?.linkShortifyKey;

                if (!session) {
                    throw new Error("You must be logged in to create V5 links.");
                }
                if (isExpired) {
                    throw new Error("Your subscription has expired.");
                }
                if (!userKey) {
                    setShowSettings(true);
                    throw new Error("Please configure your LinkShortify API Key in Settings.");
                }

                const res = await fetch('/api/v5/link/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        targetUrl,
                        ownerApiKey: userKey,
                        customSlug: customSlug || undefined
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to create link');

                setGeneratedLink(`${window.location.origin}/v5/view/${data.slug}`);
                return;
            }

            // V4 uses server-side API with CAPTCHA
            if (version === 'v4') {
                // Load reCAPTCHA if not already loaded
                if (!(window as any).grecaptcha) {
                    const script = document.createElement('script');
                    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
                    document.head.appendChild(script);
                    await new Promise(resolve => script.onload = resolve);
                }

                // Execute reCAPTCHA
                const token = await (window as any).grecaptcha.execute(
                    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
                    { action: 'generate_link' }
                );

                // Call API
                const response = await fetch('/api/v4', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: targetUrl, captchaToken: token }),
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to generate link');

                setGeneratedLink(data.link);
                return;
            }

            // For other versions, use client-side encoding
            let slug = "";
            let prefix = "";

            switch (version) {
                case 'v1':
                    slug = encodeLinkV1(targetUrl);
                    prefix = "v1/";
                    break;
                case 'v2':
                    slug = encodeLinkV2(targetUrl);
                    prefix = "v2/";
                    break;
                case 'v3':
                    slug = encodeLinkV3(targetUrl);
                    prefix = "v3/";
                    break;
                default:
                    slug = encodeLink(targetUrl);
                    prefix = "";
            }

            // Use window.location.origin to get the current host
            const origin = typeof window !== "undefined" ? window.location.origin : "";
            setGeneratedLink(`${origin}/${prefix}${slug}`);

        } catch (err: any) {
            setError(err.message || 'Failed to generate link. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <main className="relative min-h-screen flex flex-col items-center bg-black text-white selection:bg-purple-500/30">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[200px] h-[200px] md:w-[500px] md:h-[500px] rounded-full bg-purple-600/10 blur-[50px] md:blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[200px] h-[200px] md:w-[500px] md:h-[500px] rounded-full bg-blue-600/10 blur-[50px] md:blur-[100px]" />
            </div>

            {/* Premium Header */}
            <nav className="z-20 w-full max-w-7xl px-6 py-6 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-lg sticky top-0">
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.reload()}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Link2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight hidden sm:block">Asprin Links</span>
                </div>

                <div className="flex items-center gap-3">
                    {session ? (
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex flex-col items-end mr-2">
                                <span className="text-sm font-medium text-white">{session.user?.name}</span>
                                <span className="text-xs text-zinc-500">Premium User</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className="p-2.5 bg-zinc-900/50 hover:bg-zinc-800 border border-white/10 rounded-xl transition-all"
                                    title="Settings"
                                >
                                    <Settings className="w-5 h-5 text-zinc-400" />
                                </button>
                                <button
                                    onClick={() => signOut()}
                                    className="p-2.5 bg-zinc-900/50 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-xl text-zinc-400 hover:text-red-400 transition-all"
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                                {session.user?.image ? (
                                    <img src={session.user.image} alt="Profile" className="w-10 h-10 rounded-xl border border-white/10" />
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/10">
                                        <UserIcon className="w-5 h-5 text-zinc-400" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => signIn("google")}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98]"
                            >
                                <UserIcon className="w-4 h-4" />
                                <span>Sign In / Join</span>
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            <div className="z-10 w-full max-w-2xl px-6 py-12 md:py-20">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={variants}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="space-y-10"
                >
                    <div className="text-center space-y-4">
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
                            Shorten. Secure. Control.
                        </h1>
                        <p className="text-zinc-400 text-lg max-w-md mx-auto">
                            The ultimate link protection service with multiple security layers.
                        </p>
                    </div>

                    {/* Section Switcher */}
                    <div className="flex p-1.5 bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-white/5 max-w-sm mx-auto">
                        <button
                            onClick={() => setCategory('standard')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${category === 'standard' ? 'bg-zinc-800 text-white shadow-lg border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Standard Tools
                        </button>
                        <button
                            onClick={() => setCategory('advanced')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${category === 'advanced' ? 'bg-zinc-800 text-white shadow-lg border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Advanced Guard
                        </button>
                    </div>

                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-3xl opacity-20 blur-xl group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden min-h-[400px]">

                            {/* Settings Overlay */}
                            <AnimatePresence>
                                {showSettings && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="absolute inset-0 bg-zinc-950/95 z-30 flex flex-col p-8"
                                    >
                                        <div className="flex justify-between items-center mb-8">
                                            <h2 className="text-2xl font-bold text-white tracking-tight">Configuration</h2>
                                            <button
                                                onClick={() => setShowSettings(false)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-medium text-zinc-400">LinkShortify API Key</label>
                                                    {hasKey && <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Configured</span>}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={apiKeyInput}
                                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-zinc-700 outline-none focus:ring-2 focus:ring-purple-500/50 active:scale-[0.99] transition-all"
                                                    placeholder="Paste your key here"
                                                />
                                                <p className="text-[10px] text-zinc-500 px-1">We will test your key by generating a temporary short link before saving.</p>
                                            </div>

                                            {saveStatus && (
                                                <div className={`p-4 rounded-xl text-xs font-medium border ${saveStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                                    {saveStatus.msg}
                                                </div>
                                            )}

                                            <button
                                                onClick={handleSaveKey}
                                                disabled={savingKey || !apiKeyInput.trim()}
                                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50"
                                            >
                                                {savingKey ? 'Verifying & Saving...' : 'Save & Verify Account'}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="p-8 md:p-10">
                                {category === 'advanced' && !session ? (
                                    /* Auth Gate for Advanced Section */
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-10">
                                        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center border border-white/10">
                                            <Lock className="w-8 h-8 text-purple-400" />
                                        </div>
                                        <div className="space-y-3">
                                            <h2 className="text-2xl font-bold text-white">Protected Section</h2>
                                            <p className="text-zinc-400 max-w-[280px] mx-auto">
                                                Advanced security layers (v4 & v5) require an active account to prevent misuse.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => signIn("google")}
                                            className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all active:scale-[0.95] flex items-center gap-3 shadow-xl"
                                        >
                                            <UserIcon className="w-5 h-5" />
                                            Sign In to Unlock
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                                        {/* Version/Security Selection */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4" />
                                                Security Protocol
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {category === 'standard' ? (
                                                    <>
                                                        {[
                                                            { id: 'base', label: 'Basic', sub: 'XOR Encoding' },
                                                            { id: 'v1', label: 'v1 Enhanced', sub: 'Base64 Mix' },
                                                            { id: 'v2', label: 'v2 Advanced', sub: 'Custom Cipher' },
                                                            { id: 'v3', label: 'v3 Linkify', sub: 'Optimized' }
                                                        ].map((opt) => (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => setVersion(opt.id as Version)}
                                                                className={`p-4 rounded-2xl text-left border transition-all ${version === opt.id ? 'bg-purple-600/10 border-purple-500/50 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}
                                                            >
                                                                <div className="font-bold text-sm">{opt.label}</div>
                                                                <div className="text-[10px] opacity-60 uppercase tracking-widest mt-1">{opt.sub}</div>
                                                            </button>
                                                        ))}
                                                    </>
                                                ) : (
                                                    <>
                                                        {[
                                                            { id: 'v4', label: 'v4 Captcha', sub: 'Human Verification' },
                                                            { id: 'v5', label: 'v5 Secure Trap', sub: 'Account Locked' }
                                                        ].map((opt) => (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => setVersion(opt.id as Version)}
                                                                className={`p-4 rounded-2xl text-left border transition-all ${version === opt.id ? 'bg-blue-600/10 border-blue-500/50 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}
                                                            >
                                                                <div className="font-bold text-sm">{opt.label}</div>
                                                                <div className="text-[10px] opacity-60 uppercase tracking-widest mt-1">{opt.sub}</div>
                                                            </button>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* V5 Status Messages */}
                                        {version === 'v5' && session && validUntil && (
                                            <div className={`p-4 rounded-2xl text-sm flex items-center gap-3 ${isExpired ? 'bg-red-500/10 border border-red-500/20 text-red-500' : 'bg-green-500/10 border border-green-500/20 text-green-500'}`}>
                                                <div className={`w-2 h-2 rounded-full animate-pulse ${isExpired ? 'bg-red-500' : 'bg-green-500'}`} />
                                                {isExpired ? `Subscription Expired on ${validUntil}` : `Premium valid until: ${validUntil}`}
                                            </div>
                                        )}

                                        {/* URL Input */}
                                        <div className="space-y-3">
                                            <label htmlFor="url-input" className="text-sm font-medium text-zinc-400">
                                                Target Destination
                                            </label>
                                            <div className="relative group/input">
                                                <input
                                                    id="url-input"
                                                    type="url"
                                                    disabled={version === 'v5' && isExpired}
                                                    placeholder={version === 'v3' ? 'https://lksfy.com/QDuafv' : 'https://your-link.com'}
                                                    className="w-full p-5 pl-14 rounded-2xl border border-white/10 bg-black/40 hover:bg-black/60 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-50"
                                                    value={url}
                                                    onChange={(e) => setUrl(e.target.value)}
                                                    required
                                                />
                                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/input:text-purple-400 transition-colors">
                                                    <Link2 className="w-6 h-6" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Custom Slug for V5 */}
                                        {version === 'v5' && (
                                            <div className="space-y-3">
                                                <label className="text-sm font-medium text-zinc-400">Custom Alias (Optional)</label>
                                                <input
                                                    type="text"
                                                    disabled={isExpired}
                                                    placeholder="my-secret-link"
                                                    className="w-full p-5 rounded-2xl border border-white/10 bg-black/40 hover:bg-black/60 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
                                                    value={customSlug}
                                                    onChange={(e) => setCustomSlug(e.target.value)}
                                                />
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={loading || (version === 'v5' && isExpired)}
                                            className="relative w-full py-5 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 border border-white/10 text-white font-bold rounded-2xl transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
                                        >
                                            <span className="flex items-center justify-center gap-3">
                                                {loading ? (
                                                    <>
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="w-5 h-5" />
                                                        Generate Secure Link
                                                    </>
                                                )}
                                            </span>
                                        </button>

                                        <AnimatePresence>
                                            {error && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
                                                >
                                                    <p className="text-sm text-red-500 text-center font-medium">{error}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </form>
                                )}
                            </div>

                            {/* Result Section */}
                            <AnimatePresence>
                                {generatedLink && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-8 md:p-10 bg-zinc-950/50 border-t border-white/5"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                                                <ShieldCheck className="w-4 h-4" />
                                                LINK READY
                                            </div>
                                            {copied && (
                                                <span className="text-xs text-green-400 font-medium">Copied to clipboard</span>
                                            )}
                                        </div>
                                        <div
                                            onClick={copyToClipboard}
                                            className="group cursor-pointer relative p-5 rounded-2xl bg-black border border-white/10 hover:border-purple-500/40 transition-all active:scale-[0.99]"
                                        >
                                            <p className="break-all text-zinc-200 font-mono text-sm pr-12 group-hover:text-white transition-colors">
                                                {generatedLink}
                                            </p>
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 group-hover:text-purple-400 transition-colors">
                                                {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="pt-8 text-center space-y-4">
                        <div className="flex items-center justify-center gap-6 text-zinc-500">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase tracking-widest">Encrypted</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase tracking-widest">Private</span>
                            </div>
                        </div>
                        <p className="text-sm text-zinc-500">
                            Crafted with passion by{' '}
                            <a
                                href="https://t.me/happySaturday_bitch"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-300 hover:text-white underline decoration-zinc-800 hover:decoration-purple-500 underline-offset-8 transition-all"
                            >
                                asprin dev
                            </a>
                        </p>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
