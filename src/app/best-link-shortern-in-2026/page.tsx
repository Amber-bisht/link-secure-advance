"use client";

import React from "react";
import { motion } from "framer-motion";
import { ExternalLink, Check, X, AlertTriangle, Shield, DollarSign, Zap } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/Footer";

const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
};

const data = {
    "title": "Best Link Shortener in India",
    "slug": "best-link-shortener-india",
    "description": "Detailed comparison of top link shortener platforms in India with CPM rates, payout systems, anti-bypass protection, and publisher features.",
    "region": "India",
    "currency": "USD",
    "traffic_type_supported": [
        "Mobile",
        "Desktop",
        "Android WebView"
    ],
    "last_updated": "2026-01-19",
    "services": [
        {
            "id": 1,
            "name": "Asprin Link Protect",
            "official_website": "https://links.asprin.dev",
            "category": "Link Protection / Wrapper",
            "short_page": "/short",
            "monetization": false,
            "primary_purpose": "Maximize earnings & prevent link bypass across all platforms",
            "description": "The ultimate tool to maximize your profit from other shorteners. It wraps your monetized links to block bots and prevent bypassing, ensuring every click counts towards your revenue.",
            "security_features": {
                "captcha": true,
                "cloudflare_protection": true,
                "anti_bypass": true,
                "fraud_detection": true
            },
            "risk_level": "very_low"
        },
        {
            "id": 2,
            "name": "LinkShortify",
            "official_website": "https://linkshortify.com",
            "status": "active",
            "cpm_india": { "min": 8, "max": 10, "average": 9 },
            "payout": {
                "minimum_amount": 5,
                "currency": "USD",
                "frequency": "Weekly",
                "payment_methods": ["UPI", "PayPal", "Payeer", "Crypto"]
            },
            "traffic_rules": {
                "per_ip_count": 1,
                "session_duration_minutes": 6,
                "vpn_allowed": false,
                "proxy_allowed": false
            },
            "security_features": {
                "captcha": true,
                "cloudflare_protection": true,
                "anti_bypass": true,
                "fraud_detection": true
            },
            "risk_level": "low"
        },
        {
            "id": 3,
            "name": "Arolinks",
            "official_website": "https://arolinks.com",
            "status": "active",
            "cpm_india": { "min": 6, "max": 8, "average": 7 },
            "payout": {
                "minimum_amount": 2,
                "currency": "USD",
                "frequency": "Daily",
                "payment_methods": ["UPI", "PayPal", "Google Pay", "PhonePe"]
            },
            "security_features": {
                "captcha": true,
                "cloudflare_protection": false,
                "anti_bypass": true,
                "fraud_detection": true
            },
            "risk_level": "low"
        },
        {
            "id": 4,
            "name": "VPlinks",
            "official_website": "http://vplink.in",
            "status": "unverified",
            "cpm_india": { "min": 6, "max": 8, "average": 7 },
            "payout": {
                "minimum_amount": null,
                "currency": "USD",
                "frequency": "Unknown",
                "payment_methods": []
            },
            "security_features": {
                "captcha": "unknown",
                "cloudflare_protection": "unknown",
                "anti_bypass": "claimed",
                "fraud_detection": "unknown"
            },
            "risk_level": "high"
        },
        {
            "id": 5,
            "name": "InShortUrl",
            "official_website": "https://inshorturl.com",
            "category": "Monetized Link Shortener",
            "status": "active",
            "cpm_india": { "min": 0, "max": 10, "average": 10, "notes": "Advertised up to $10 CPM for Indian traffic" },
            "payout": {
                "minimum_amount": 5,
                "currency": "USD",
                "frequency": "Monthly",
                "payment_methods": [
                    "UPI",
                    "Google Pay",
                    "Paytm",
                    "PhonePe",
                    "FamPay",
                    "Bank Transfer",
                    "USDT",
                    "Bitcoin",
                    "Digital Gift Cards"
                ],
                "payout_timing": "Monthly, up to 72 hours for withdrawal"
            },
            "security_features": {
                "captcha": true,
                "cloudflare_protection": false,
                "anti_bypass": true,
                "fraud_detection": true
            },
            "publisher_features": [
                "Detailed link analytics",
                "Telegram bot integration",
                "API access",
                "Referral earnings"
            ],
            "risk_level": "medium",
            "notes": "Offers interstitial ads and CPM earnings; traffic quality affects payout"
        }
    ],
    "editor_notes": {
        "cpm_disclaimer": "Advertised CPM rates are not guaranteed and vary by traffic quality, device and demand.",
        "anti_bypass_tip": "Use link protection layers (like Asprin Link Protect) with monetized shorteners to reduce bypass losses.",
        "payout_note": "Always verify payout terms and minimum thresholds before choosing a service.",
        "optimization_tip": "Using session-based URL rotation can increase effective earnings without violating platform policies."
    }
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

            <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeIn}
                    className="space-y-12"
                >
                    <div className="text-center max-w-3xl mx-auto space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-400 mb-2">
                            <span>{data.region}</span>
                            <span className="w-1 h-1 bg-neutral-500 rounded-full" />
                            <span>Updated {data.last_updated}</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                            {data.title}
                        </h1>
                        <p className="text-lg text-neutral-300">
                            {data.description}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data.services.map((service, idx) => (
                            <div key={service.id} className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100" />
                                <div className="relative h-full bg-neutral-900/50 border border-white/5 p-6 rounded-2xl backdrop-blur-md hover:border-white/10 transition-colors flex flex-col">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                                {service.name}
                                                {service.status === 'active' && <Check size={16} className="text-green-500" />}
                                                {service.status === 'unverified' && <AlertTriangle size={16} className="text-yellow-500" />}
                                            </h3>
                                            {service.category && <p className="text-xs text-indigo-400">{service.category}</p>}
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${service.risk_level === 'low' || service.risk_level === 'very_low' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {service.risk_level === 'very_low' ? 'Low Risk' : service.risk_level.replace('_', ' ').toUpperCase()}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        {service.cpm_india && (
                                            <div className="space-y-1">
                                                <p className="text-xs text-neutral-500 flex items-center gap-1"><DollarSign size={12} /> CPM (India)</p>
                                                <p className="text-sm font-mono text-neutral-200">${service.cpm_india.average} <span className="text-neutral-600">(${service.cpm_india.min}-${service.cpm_india.max})</span></p>
                                            </div>
                                        )}
                                        {service.payout && (
                                            <div className="space-y-1">
                                                <p className="text-xs text-neutral-500 flex items-center gap-1"><Zap size={12} /> Min Payout</p>
                                                <p className="text-sm font-mono text-neutral-200">${service.payout.minimum_amount} <span className="text-neutral-600">({service.payout.frequency})</span></p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3 mb-6 flex-grow">
                                        <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Security</p>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-neutral-300">
                                            <div className="flex items-center gap-2">
                                                {service.security_features.captcha !== false ? <Shield size={14} className="text-indigo-400" /> : <X size={14} className="text-neutral-600" />}
                                                <span>Captcha</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {service.security_features.anti_bypass === true ? <Check size={14} className="text-green-400" /> : <AlertTriangle size={14} className="text-yellow-400" />}
                                                <span>Anti-Bypass</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 mt-auto">
                                        <a
                                            href={service.official_website !== 'N/A' ? service.official_website : '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`w-full flex justify-center items-center gap-2 py-3 rounded-lg font-medium transition-transform active:scale-95 ${service.official_website !== 'N/A'
                                                ? 'bg-white text-black hover:bg-neutral-200'
                                                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                                }`}
                                        >
                                            {service.official_website !== 'N/A' ? 'Visit Website' : 'Website N/A'}
                                            {service.official_website !== 'N/A' && <ExternalLink size={16} />}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-6">
                        <h4 className="text-indigo-300 font-semibold mb-2 flex items-center gap-2"><Zap size={18} /> Editor's Note</h4>
                        <p className="text-sm text-indigo-200/80">{data.editor_notes.optimization_tip}</p>
                    </div>

                </motion.div>
            </main>

            <Footer />
        </div>
    );
}