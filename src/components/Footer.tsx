"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, Twitter, Github, Heart } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t border-white/5 bg-black pt-16 pb-8 px-6 relative z-10">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                <div className="space-y-4">
                    <Link href="/" className="font-bold text-xl tracking-tighter hover:text-indigo-400 transition-colors">
                        LINKS.ASPRIN.DEV
                    </Link>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                        Advanced link protection and shortening services for the modern web.
                        Secure your traffic and maximize your reach.
                    </p>
                </div>

                <div>
                    <h3 className="font-semibold text-neutral-200 mb-4">Platform</h3>
                    <ul className="space-y-2 text-sm text-neutral-400">
                        <li><Link href="/" className="hover:text-indigo-400 transition-colors">Home</Link></li>
                        <li><Link href="/short" className="hover:text-indigo-400 transition-colors">Shortener</Link></li>
                        <li><a href="https://t.me/happySaturday_bitch" target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition-colors">Contact Support</a></li>
                    </ul>
                </div>

                <div>
                    <h3 className="font-semibold text-neutral-200 mb-4">Legal</h3>
                    <ul className="space-y-2 text-sm text-neutral-400">
                        <li><Link href="/term" className="hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
                        <li><Link href="/privacy" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
                        <li><Link href="/faq" className="hover:text-indigo-400 transition-colors">FAQ</Link></li>
                    </ul>
                </div>

                <div>
                    <h3 className="font-semibold text-neutral-200 mb-4">Coming Up</h3>
                    <ul className="space-y-2 text-sm text-neutral-400">
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            API Access
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Advanced Analytics
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Custom Domains
                        </li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-neutral-400">
                <div>
                    &copy; {new Date().getFullYear()} Links by Asprin. All rights reserved.
                </div>
                <div className="flex items-center gap-6">
                    <a href="#" aria-label="Twitter" className="hover:text-white transition-colors"><Twitter size={18} /></a>
                    <a href="#" aria-label="GitHub" className="hover:text-white transition-colors"><Github size={18} /></a>
                </div>
            </div>
        </footer>
    );
}
