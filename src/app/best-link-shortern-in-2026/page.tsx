"use client";

import React from "react";
import { motion } from "framer-motion";
import { ExternalLink, Check, X, AlertTriangle, Shield, DollarSign, Zap, Lock, Siren } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/Footer";

const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
};

const data = {
    "title": "Best Link Shortener in India (2026 Security Review)",
    "slug": "best-link-shortener-india",
    "description": "A critical look at the top link shorteners in India. Which ones actually protect your revenue from bot bypass scripts?",
    "region": "India",
    "last_updated": "2026-01-19",
    "services": [
        {
            "id": 1,
            "name": "Asprin Link Protect",
            "logo": null,
            "official_website": "https://links.asprin.dev",
            "category": "Link Protection / Wrapper",
            "type": "protection",
            "description": "The only solution in this list that is NOT a standalone shortener but a security wrapper. It sits in front of your monetized links to filter traffic.",
            "security_analysis": {
                "bot_bypass": false,
                "captcha": "Google reCAPTCHA v3 + Turnstile",
                "anti_bypass_tech": "Behavioral Analysis + Session Tokens",
                "verdict": "Secure"
            },
            "risk_level": "very_low"
        },
        {
            "id": 2,
            "name": "LinkShortify",
            "logo": "https://pub-20da4aefbab14400b5ebb8424eaebaae.r2.dev/Website/logo.webp",
            "official_website": "https://linkshortify.com",
            "category": "Monetized Shortener",
            "type": "service",
            "description": "A popular high-paying shortener in India. While they have decent security, standalone links can still be targeted by updated bypass scripts without an extra layer.",
            "security_analysis": {
                "bot_bypass": true,
                "captcha": "Standard (Turnstile)",
                "anti_bypass_tech": "Basic IP filtering",
                "verdict": "Vulnerable to sophisticated bots"
            },
            "cpm": "$9.00",
            "risk_level": "medium"
        },
        {
            "id": 3,
            "name": "Arolinks",
            "logo": "https://i.imgur.com/gM8lGS8.png",
            "official_website": "https://arolinks.com",
            "category": "Monetized Shortener",
            "type": "service",
            "description": "Known for daily payments and good support. Security is standard for the industry but lacks advanced behavioural checks.",
            "security_analysis": {
                "bot_bypass": true,
                "captcha": "Standard",
                "anti_bypass_tech": "None significant",
                "verdict": "Bypassable"
            },
            "cpm": "$7.00",
            "risk_level": "medium"
        },
        {
            "id": 4,
            "name": "VPlinks",
            "logo": "https://i.imgur.com/Poww5Ea.png",
            "official_website": "http://vplink.in",
            "category": "Monetized Shortener",
            "type": "service",
            "description": "Standard shortener with reasonable rates. Like most direct shorteners, it is susceptible to automated bypass tools.",
            "security_analysis": {
                "bot_bypass": true,
                "captcha": "Basic",
                "anti_bypass_tech": "Claimed",
                "verdict": "High Risk"
            },
            "cpm": "$7.00",
            "risk_level": "high"
        },
        {
            "id": 5,
            "name": "InShortUrl",
            "logo": "https://media.licdn.com/dms/image/v2/D4E03AQHpR7PNBaEqWw/profile-displayphoto-shrink_200_200/B4EZX1c0kkH0AY-/0/1743579728746?e=2147483647&v=beta&t=GmJdF3W71yPdXygwf34cUv0cX9kWwB3gSL2vPN7Xpvk",
            "category": "Monetized Shortener",
            "type": "service",
            "official_website": "https://inshorturl.com",
            "description": "Offers high CPM rates but strict traffic rules. Without external protection, invalid traffic usually leads to account bans rather than just blocked clicks.",
            "security_analysis": {
                "bot_bypass": true,
                "captcha": "Standard",
                "anti_bypass_tech": "Strict Rules (Ban Risk)",
                "verdict": "Bypassable"
            },
            "cpm": "$10.00",
            "risk_level": "medium"
        }
    ]
};

export default function ComparisonPage() {
    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-indigo-500/30 font-sans overflow-x-hidden">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-900/20 rounded-full blur-[120px]" />
            </div>

            {/* Navbar */}
            <motion.nav
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl"
            >
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="font-bold text-xl tracking-tighter hover:text-indigo-400 transition-colors">
                        LINKS.ASPRIN.DEV
                    </Link>
                    <div className="flex items-center gap-6 text-sm font-medium text-neutral-300">
                        <Link href="/short" className="hover:text-white transition-colors">
                            Try /short
                        </Link>
                        <a
                            href="https://t.me/happySaturday_bitch"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden md:flex items-center gap-2 hover:text-white transition-colors"
                        >
                            Contact <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            </motion.nav>

            <main className="relative z-10 pt-32 pb-20 px-6 max-w-4xl mx-auto">
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeIn}
                    className="space-y-16"
                >
                    <div className="text-center space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-400">
                            <span>{data.region}</span>
                            <span className="w-1 h-1 bg-neutral-500 rounded-full" />
                            <span>Updated {data.last_updated}</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                            {data.title}
                        </h1>
                        <p className="text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed">
                            {data.description}
                        </p>
                    </div>

                    <div className="space-y-12">
                        {data.services.map((service, idx) => (
                            <section key={service.id} className="relative group">
                                <div className="absolute -inset-4 bg-gradient-to-b from-white/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />

                                <div className="border border-white/10 bg-neutral-900/50 rounded-2xl p-8 backdrop-blur-sm">
                                    <div className="flex flex-col md:flex-row gap-6 md:items-start mb-6">
                                        {/* @ts-ignore */}
                                        {service.logo ? (
                                            <div className="flex-shrink-0">
                                                <Link href={service.official_website} target="_blank">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        /* @ts-ignore */
                                                        src={service.logo}
                                                        alt={service.name}
                                                        className="w-16 h-16 rounded-xl object-contain bg-white/5 border border-white/10"
                                                    />
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                                                <Shield className="text-indigo-400" size={32} />
                                            </div>
                                        )}

                                        <div className="flex-grow">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                                    {service.name}
                                                    {service.risk_level === 'very_low' && <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-mono flex items-center gap-1"><Check size={12} /> Low Risk</span>}
                                                </h2>
                                                <div className="flex gap-4 text-sm font-mono text-neutral-400">
                                                    {/* @ts-ignore */}
                                                    {service.cpm && <span>Avg CPM: <span className="text-white">{service.cpm}</span></span>}
                                                </div>
                                            </div>
                                            <p className="text-neutral-400 leading-relaxed mb-6">
                                                {service.description}
                                            </p>

                                            {/* Security Analysis Blog Block */}
                                            <div className="bg-black/40 rounded-xl p-6 border border-white/5">
                                                <h3 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <Lock size={14} className="text-indigo-400" /> Security Analysis
                                                </h3>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <div className="mb-4">
                                                            <span className="text-xs text-neutral-500 block mb-1">Bot Bypass (Scripts)</span>
                                                            <div className="flex items-center gap-2">
                                                                {service.security_analysis.bot_bypass ? (
                                                                    <span className="text-red-400 font-bold flex items-center gap-2">
                                                                        <AlertTriangle size={16} /> Possible
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-green-400 font-bold flex items-center gap-2">
                                                                        <Shield size={16} /> Protected
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-neutral-500 block mb-1">Anti-Bypass Tech</span>
                                                            <div className="text-neutral-300 text-sm">
                                                                {service.security_analysis.anti_bypass_tech}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="border-l border-white/10 pl-6">
                                                        <div className="mb-4">
                                                            <span className="text-xs text-neutral-500 block mb-1">Captcha System</span>
                                                            <div className="text-neutral-300 text-sm">{service.security_analysis.captcha}</div>
                                                        </div>

                                                        {service.id === 1 ? (
                                                            <div className="text-xs text-indigo-300/80 bg-indigo-500/10 p-2 rounded mt-2">
                                                                * This is the only true anti-bypass solution.
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-red-300/60 bg-red-500/5 p-2 rounded mt-2">
                                                                * Can be bypassed by advanced tools.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 flex justify-end">
                                                <Link
                                                    href={service.official_website}
                                                    target="_blank"
                                                    className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                                                >
                                                    Visit Website <ExternalLink size={12} />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>

                    <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-8 text-center max-w-2xl mx-auto">
                        <h4 className="text-indigo-300 font-semibold mb-2 flex items-center justify-center gap-2"><Siren size={20} /> The Verdict</h4>
                        <p className="text-indigo-200/80 leading-relaxed">
                            For maximum earnings, use a high-paying shortener like <strong>LinkShortify</strong> or <strong>InShortUrl</strong>, but <strong>ALWAYS</strong> wrap it with <strong>Asprin Link Protect</strong> to stop bots from getting your account banned.
                        </p>
                    </div>

                </motion.div>
            </main>

            <Footer />
        </div>
    );
}