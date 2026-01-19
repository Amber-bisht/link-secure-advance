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

export default function PrivacyPage() {
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
                            Privacy Policy
                        </h1>
                        <p className="text-neutral-400">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>
                    </div>

                    <div className="prose prose-invert prose-lg text-neutral-300 max-w-none">
                        <p className="lead">
                            At Links by Asprin, accessible from links.asprin.dev, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by us and how we use it.
                        </p>

                        <h3>1. Information We Collect</h3>
                        <p>We collect information you provide directly to us, such as when you create an account, subscribe to our newsletter, or request customer support. This may include:</p>
                        <ul>
                            <li><strong>Personal Information:</strong> Name, email address, and contact details when you register or contact us.</li>
                            <li><strong>Usage Data:</strong> IP address, browser type, device information, operating system, and timestamp of visits.</li>
                            <li><strong>Link Data:</strong> The original long URLs you submit and the shortened URLs we generate.</li>
                        </ul>

                        <h3>2. How We Use Information</h3>
                        <p>We use the information we collect to provide, maintain, and improve our services, including to:</p>
                        <ul>
                            <li>Provide, operate, and maintain our website.</li>
                            <li>Improve, personalize, and expand our website.</li>
                            <li>Understand and analyze how you use our website.</li>
                            <li>Develop new products, services, features, and functionality.</li>
                            <li>Detect and prevent fraud, malicious bots, and abuse of our services.</li>
                        </ul>

                        <h3>3. Cookies and Web Beacons</h3>
                        <p>
                            Like any other website, Links by Asprin uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited.
                            The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.
                        </p>

                        <h3>4. Third Party Privacy Policies</h3>
                        <p>
                            Our Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information.
                            It may include their practices and instructions about how to opt-out of certain options.
                        </p>

                        <h3>5. Data Security</h3>
                        <p>
                            We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
                            However, no method of transmission over the Internet, or method of electronic storage, is 100% secure.
                        </p>

                        <h3>6. Children's Information</h3>
                        <p>
                            Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity.
                            We do not knowingly collect any Personal Identifiable Information from children under the age of 13.
                        </p>
                    </div>
                </motion.div>
            </main>

            <Footer />
        </div>
    );
}
