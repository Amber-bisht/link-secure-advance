"use client";

import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/Footer";

const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
};

export default function TermsPage() {
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
                    <div className="border-b border-white/10 pb-8">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 mb-4">
                            Terms of Service
                        </h1>
                        <p className="text-neutral-400">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>
                    </div>

                    <div className="prose prose-invert prose-lg text-neutral-300 max-w-none">
                        <p className="lead">
                            Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Links by Asprin website (the "Service") operated by Asprin Dev ("us", "we", or "our").
                        </p>

                        <h3>1. Acceptance of Terms</h3>
                        <p>
                            By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.
                            If you disagree with any part of the terms, then you may not access the Service.
                        </p>

                        <h3>2. Service Description</h3>
                        <p>
                            We provide a link protection and wrapping service designed to validate traffic and filter out bots.
                            We reserve the right to modify, suspend, or discontinue the service with or without notice at any time and without any liability to you.
                            We do not guarantee that the service will be available at all times.
                        </p>

                        <h3>3. User Conduct</h3>
                        <p>
                            You agree not to use the service for any unlawful purpose or in any way that:]
                        </p>
                        <ul>
                            <li>Interrupts, damages, impairs, or renders the service less efficient.</li>
                            <li>Transfers files that contain viruses, trojans, or other harmful programs.</li>
                            <li>Attempts to bypass our security measures or reverse engineer our systems.</li>
                            <li>Promotes illegal activities, hate speech, or harassment.</li>
                        </ul>

                        <h3>4. Intellectual Property</h3>
                        <p>
                            The Service and its original content, features, and functionality are and will remain the exclusive property of Asprin Dev and its licensors.
                            The Service is protected by copyright, trademark, and other laws of both the India and foreign countries.
                        </p>

                        <h3>5. Termination</h3>
                        <p>
                            We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                            All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
                        </p>

                        <h3>6. Limitation of Liability</h3>
                        <p>
                            In no event shall Asprin Dev, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content.
                        </p>

                        <h3>7. Changes</h3>
                        <p>
                            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                        </p>

                        <h3>8. Contact Us</h3>
                        <p>
                            If you have any questions about these Terms, please contact us via our support channels.
                        </p>
                    </div>
                </motion.div>
            </main>

            <Footer />
        </div>
    );
}
