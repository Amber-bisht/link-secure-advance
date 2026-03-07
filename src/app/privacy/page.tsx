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

                    <div className="bg-neutral-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                        <div className="space-y-10 text-neutral-300 leading-relaxed text-lg">
                            <p className="text-xl text-indigo-100 font-medium">
                                At Links by Asprin, accessible from links.asprin.dev, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by us and how we use it.
                            </p>

                            <section className="space-y-4">
                                <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm">1</span>
                                    Information We Collect
                                </h3>
                                <p>We collect information you provide directly to us, such as when you create an account, subscribe to our newsletter, or request customer support. This may include:</p>
                                <ul className="space-y-3 list-none pl-4">
                                    {[
                                        { title: "Personal Information", desc: "Name, email address, and contact details when you register or contact us." },
                                        { title: "Usage Data", desc: "IP address, browser type, device information, operating system, and timestamp of visits." },
                                        { title: "Link Data", desc: "The original long URLs you submit and the shortened URLs we generate." }
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                                            <span><strong className="text-white font-semibold">{item.title}:</strong> {item.desc}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm">2</span>
                                    How We Use Information
                                </h3>
                                <p>We use the information we collect to provide, maintain, and improve our services, including to:</p>
                                <ul className="space-y-3 list-none pl-4">
                                    {[
                                        "Provide, operate, and maintain our website.",
                                        "Improve, personalize, and expand our website.",
                                        "Understand and analyze how you use our website.",
                                        "Develop new products, services, features, and functionality.",
                                        "Detect and prevent fraud, malicious bots, and abuse of our services."
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm">3</span>
                                    Cookies and Web Beacons
                                </h3>
                                <p>
                                    Like any other website, Links by Asprin uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited.
                                    The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm">4</span>
                                    Third Party Privacy Policies
                                </h3>
                                <p>
                                    Our Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information.
                                    It may include their practices and instructions about how to opt-out of certain options.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm">5</span>
                                    Data Security
                                </h3>
                                <p>
                                    We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
                                    However, no method of transmission over the Internet, or method of electronic storage, is 100% secure.
                                </p>
                            </section>

                            <section className="space-y-4 p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                                <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/30 text-indigo-300 text-sm">6</span>
                                    Children's Information
                                </h3>
                                <p className="text-indigo-100">
                                    Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity.
                                    We do not knowingly collect any Personal Identifiable Information from children under the age of 13.
                                </p>
                            </section>
                        </div>
                    </div>
                </motion.div>
            </main>

            <Footer />
        </div>
    );
}
