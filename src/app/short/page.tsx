"use client";

import { useState, useEffect } from "react";
import { encodeLink, encodeLinkV1, encodeLinkV2, encodeLinkV3 } from "@/utils/linkWrapper";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Copy, CheckCircle, ShieldCheck, Lock, Settings, LogOut, User as UserIcon } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

type Version = 'base' | 'v1' | 'v2' | 'v3' | 'v4' | 'v4.1' | 'v5';
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
    const [version, setVersion] = useState<Version>("v4");
    // const [category, setCategory] = useState<Category>("advanced"); // Default to advanced/v4
    const [generatedLink, setGeneratedLink] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    // V5 Specific State
    const [validUntil, setValidUntil] = useState<string | null>(null);
    const [isExpired, setIsExpired] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [aroLinksKey, setAroLinksKey] = useState('');
    const [vpLinkKey, setVpLinkKey] = useState('');
    const [inShortUrlKey, setInShortUrlKey] = useState('');
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
                // Populate keys if available
                if (data.keys) {
                    setApiKeyInput(data.keys.linkShortify || '');
                    setAroLinksKey(data.keys.aroLinks || '');
                    setVpLinkKey(data.keys.vpLink || '');
                    setInShortUrlKey(data.keys.inShortUrl || '');
                }
            });
        }
    }, [session, version]);

    // Category switching logic removed as only Advanced is supported now
    useEffect(() => {
        // Enforce v4+ versions
        if (version !== 'v4' && version !== 'v4.1' && version !== 'v5') {
            setVersion('v4');
        }
    }, [version]);

    const handleSaveKey = async () => {
        setSavingKey(true);
        setSaveStatus(null);
        try {
            const res = await fetch('/api/user/update-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    linkShortifyKey: apiKeyInput,
                    aroLinksKey,
                    vpLinkKey,
                    inShortUrlKey
                })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to save');

            setSaveStatus({ type: 'success', msg: 'Keys saved successfully!' });
            setHasKey(!!apiKeyInput);

            // Clear message after a delay
            setTimeout(() => {
                setSaveStatus(null);
            }, 3000);

        } catch (e: any) {
            setSaveStatus({ type: 'error', msg: e.message || 'Error saving keys' });
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
                if (!session) {
                    throw new Error("You must be logged in to create V5 links.");
                }
                if (isExpired) {
                    throw new Error("Your subscription has expired.");
                }

                const res = await fetch('/api/v5/link/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        targetUrl,
                        customSlug: customSlug || undefined
                    }),
                });

                const data = await res.json();

                if (data.code === 'KEY_MISSING') {
                    setShowSettings(true);
                    throw new Error("Please configure your LinkShortify API Key in Settings.");
                }

                if (!res.ok) throw new Error(data.error || 'Failed to create link');

                setGeneratedLink(`${window.location.origin}/v5/view/${data.slug}`);
                return;
            }

            // V4 uses server-side API with CAPTCHA
            if (version === 'v4' || version === 'v4.1') {
                if (!session) {
                    throw new Error("You must be logged in to create V4/V4.1 links.");
                }
                if (isExpired) {
                    throw new Error("Your subscription has expired.");
                }

                // Load reCAPTCHA if not already loaded
                if (!(window as any).grecaptcha) {
                    const script = document.createElement('script');
                    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
                    document.head.appendChild(script);
                    await new Promise(resolve => script.onload = resolve);
                }

                // Wait for grecaptcha to be fully ready
                await new Promise<void>((resolve) => {
                    const check = setInterval(() => {
                        if ((window as any).grecaptcha && (window as any).grecaptcha.ready) {
                            clearInterval(check);
                            (window as any).grecaptcha.ready(() => resolve());
                        }
                    }, 100);
                    // Safe timeout
                    setTimeout(() => { clearInterval(check); resolve(); }, 5000);
                });

                // Double check if execute is available
                if (!(window as any).grecaptcha?.execute) {
                    // Fallback/Retry logic or throw clearer error
                    throw new Error("Security verification failed to load. Please try again.");
                }

                // Execute reCAPTCHA
                const token = await (window as any).grecaptcha.execute(
                    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
                    { action: 'generate_link' }
                );

                // Call appropriate API endpoint
                const apiEndpoint = version === 'v4.1' ? '/api/v4.1' : '/api/v4';
                const response = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: targetUrl, captchaToken: token }),
                });

                const data = await response.json();

                if (version === 'v4.1' && data.code === 'KEY_MISSING') {
                    setShowSettings(true);
                    throw new Error("Please configure your LinkShortify API Key in Settings to use V4.1.");
                }

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
                    <span className="font-bold text-xl tracking-tight">links.asprin.dev</span>
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

            <a
                href="https://t.me/asprin_devs"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-y border-white/5 py-3 px-4 text-center cursor-pointer hover:bg-white/5 transition-all"
            >
                <p className="text-sm font-medium text-zinc-300">
                    📢 <span className="text-white font-bold hover:underline">Join our announcement channel</span> for more info
                </p>
            </a>

            <div className="z-10 w-full max-w-7xl px-6 py-12 md:py-20">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
                    {/* Left Column: Title and Switcher */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={variants}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="space-y-10 lg:sticky lg:top-32"
                    >
                        <div className="text-left space-y-6">
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 leading-[1.1]">
                                Shorten.<br />Secure.<br />Control.
                            </h1>
                            <p className="text-zinc-400 text-lg md:text-xl max-w-md leading-relaxed">
                                The ultimate link protection service with multiple security layers.
                            </p>
                        </div>

                        <div className="hidden lg:block space-y-2">
                            <p className="text-xs font-bold text-zinc-600 uppercase tracking-[0.2em]">
                                Military Grade Protection
                            </p>
                            <p className="text-sm text-zinc-500 max-w-xs">
                                Secured with reCAPTCHA v3 and premium account verification.
                            </p>
                        </div>
                    </motion.div>

                    {/* Right Column: Form and Results */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={variants}
                        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                        className="space-y-8"
                    >
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
                                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-sm font-medium text-zinc-400">LinkShortify Key (Priority 1 & Fallback)</label>
                                                            {apiKeyInput && <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Configured</span>}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={apiKeyInput}
                                                            onChange={(e) => setApiKeyInput(e.target.value)}
                                                            onBlur={handleSaveKey}
                                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-zinc-700 outline-none focus:ring-2 focus:ring-purple-500/50 active:scale-[0.99] transition-all"
                                                            placeholder="Paste LinkShortify Key"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-sm font-medium text-zinc-400">AroLinks Key (Optional - Priority 2)</label>
                                                            {aroLinksKey && <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Configured</span>}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={aroLinksKey}
                                                            onChange={(e) => setAroLinksKey(e.target.value)}
                                                            onBlur={handleSaveKey}
                                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-zinc-700 outline-none focus:ring-2 focus:ring-purple-500/50 active:scale-[0.99] transition-all"
                                                            placeholder="Paste AroLinks Key"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-sm font-medium text-zinc-400">VPLink Key (Optional - Priority 3)</label>
                                                            {vpLinkKey && <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Configured</span>}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={vpLinkKey}
                                                            onChange={(e) => setVpLinkKey(e.target.value)}
                                                            onBlur={handleSaveKey}
                                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-zinc-700 outline-none focus:ring-2 focus:ring-purple-500/50 active:scale-[0.99] transition-all"
                                                            placeholder="Paste VPLink Key"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-sm font-medium text-zinc-400">InShortUrl Key (Optional - Priority 4)</label>
                                                            {inShortUrlKey && <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Configured</span>}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={inShortUrlKey}
                                                            onChange={(e) => setInShortUrlKey(e.target.value)}
                                                            onBlur={handleSaveKey}
                                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-zinc-700 outline-none focus:ring-2 focus:ring-purple-500/50 active:scale-[0.99] transition-all"
                                                            placeholder="Paste InShortUrl Key"
                                                        />
                                                    </div>

                                                    <p className="text-[10px] text-zinc-500 px-1">We will save these keys used for rotating traffic. Keep fields empty to skip providers.</p>
                                                </div>

                                                {savingKey && (
                                                    <div className="p-4 rounded-xl text-xs font-medium border bg-blue-500/10 border-blue-500/20 text-blue-500 flex items-center gap-2">
                                                        <div className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                                        Validating keys...
                                                    </div>
                                                )}

                                                {saveStatus && !savingKey && (
                                                    <div className={`p-4 rounded-xl text-xs font-medium border ${saveStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                                        {saveStatus.msg}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="p-8 md:p-10">
                                    {!session ? (
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
                                                    {[
                                                        { id: 'v4', label: 'v4 Captcha', sub: 'Human Verification' },
                                                        { id: 'v4.1', label: 'v4.1 LinkShortify', sub: 'Session Protected' }
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
                                                </div>
                                                {version === 'v4.1' && (
                                                    <div className="mt-4 p-4 bg-blue-900/10 border border-blue-500/10 rounded-2xl flex items-center gap-4">
                                                        <img
                                                            src="https://pub-20da4aefbab14400b5ebb8424eaebaae.r2.dev/Website/logo.webp"
                                                            alt="LinkShortify Logo"
                                                            className="w-12 h-12 object-contain"
                                                        />
                                                        <div className="flex-1 space-y-1">
                                                            <p className="text-sm text-zinc-200 font-medium">
                                                                Configure keys for <span className="text-blue-400">All Platforms</span>.
                                                            </p>
                                                            <button
                                                                onClick={() => setShowSettings(true)}
                                                                className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 flex items-center gap-1"
                                                            >
                                                                Click here to configure keys
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* V4/V4.1/V5 Status Messages */}
                                            {(version === 'v4' || version === 'v4.1' || version === 'v5') && session && validUntil && (
                                                <div className={`p-4 rounded-2xl text-sm flex items-center justify-between gap-3 ${isExpired ? 'bg-red-500/10 border border-red-500/20 text-red-500' : 'bg-green-500/10 border border-green-500/20 text-green-500'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full animate-pulse ${isExpired ? 'bg-red-500' : 'bg-green-500'}`} />
                                                        <span>{isExpired ? `Subscription Expired on ${validUntil}` : `Premium valid until: ${validUntil}`}</span>
                                                    </div>
                                                    {isExpired && (
                                                        <a
                                                            href="https://t.me/happySaturday_bitch"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-bold uppercase tracking-widest bg-red-500/20 px-3 py-1 rounded-full border border-red-500/20 hover:bg-red-500/30 transition-all whitespace-nowrap"
                                                        >
                                                            Add validity for free
                                                        </a>
                                                    )}
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
                                                        disabled={(version === 'v4' || version === 'v4.1' || version === 'v5') && isExpired}
                                                        placeholder={version === 'v3' ? 'https://lksfy.com/QDuafv' : version === 'v4.1' ? 'https://t.me/your_channel' : 'https://your-link.com'}
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
                                                disabled={loading || ((version === 'v4' || version === 'v4.1' || version === 'v5') && isExpired)}
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
                        <div className="pt-8 text-center lg:text-left space-y-6">
                            <div className="flex items-center justify-center lg:justify-start gap-8 text-zinc-500">
                                <div className="flex items-center gap-2.5">
                                    <ShieldCheck className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">AES-256 Encrypted</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Lock className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Stateless & Private</span>
                                </div>
                            </div>
                            <p className="text-sm text-zinc-600 font-medium">
                                Crafted with passion by{' '}
                                <a
                                    href="https://t.me/happySaturday_bitch"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zinc-400 hover:text-white underline decoration-zinc-800 hover:decoration-purple-500/50 underline-offset-8 transition-all"
                                >
                                    asprin dev
                                </a>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
