"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, ChevronDown } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { Footer } from "@/components/Footer";

const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
};

interface FAQItem {
    question: string;
    answer: React.ReactNode;
}

const faqs: FAQItem[] = [
    {
        question: "What is Link Protect?",
        answer: "Link Protect is a security wrapper for your short links. It adds a layer of validation to meaningful traffic and blocks bots before they even reach your destination URL. This ensures that only genuine users access your content."
    },
    {
        question: "Does it affect my earnings?",
        answer: "It can actually increase your effective earnings by filtering out invalid traffic that might get your publisher account banned. We ensure only real humans reach your monetized links, protecting your reputation with ad networks."
    },
    {
        question: "How do I use it?",
        answer: "Simply paste your existing short link (from any provider like bit.ly, tinyurl, etc.) into our dashboard, and we'll generate a protected 'wrapped' link for you to share. When users click this new link, they pass through our security check first."
    },
    {
        question: "Is it free?",
        answer: "Yes, the core protection features are free to use. We believe in making the web safer for everyone. We may offer premium features for advanced analytics, custom branding, and priority support in the future."
    },
    {
        question: "What kind of bots do you block?",
        answer: "We block a wide range of automated traffic, including scrapers, crawlers, and malicious bots that can skew your analytics or abuse your links. Our system is constantly updated to recognize new bot patterns."
    },
    {
        question: "Can I track my link performance?",
        answer: "Basic analytics are available now, showing you the number of protected clicks. We are working on a comprehensive dashboard that will provide detailed insights into your traffic sources, geography, and device types."
    },
    {
        question: "Do you support API access?",
        answer: "API access is currently in development and will be available soon for developers who want to integrate our protection service directly into their applications. Check our 'Coming Up' section for updates!"
    }
];

export default function FAQPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-indigo-500/30 font-sans overflow-x-hidden flex flex-col">
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

            <main className="relative z-10 pt-32 pb-20 px-6 max-w-4xl mx-auto flex-grow w-full">
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeIn}
                    className="space-y-8"
                >
                    <div className="text-center space-y-4 mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                            Frequently Asked Questions
                        </h1>
                        <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
                            Everything you need to know about our link protection service. Can't find the answer you're looking for? Feel free to contact us.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div key={index} className="border border-white/5 bg-neutral-900/50 rounded-lg overflow-hidden backdrop-blur-sm">
                                <button
                                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                    className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                                >
                                    <span className="font-semibold text-neutral-200">{faq.question}</span>
                                    <ChevronDown
                                        className={clsx("text-neutral-500 transition-transform duration-300", {
                                            "rotate-180": openIndex === index
                                        })}
                                    />
                                </button>
                                <AnimatePresence>
                                    {openIndex === index && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <div className="p-6 pt-0 text-neutral-300 border-t border-white/5 leading-relaxed">
                                                {faq.answer}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>

                </motion.div>
            </main>

            <Footer />
        </div>
    );
}
