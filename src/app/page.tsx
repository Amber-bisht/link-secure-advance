"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, Lock, Bot, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Footer } from "@/components/Footer";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
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
        {/* Hero Section */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8"
        >


          <motion.h1 variants={fadeIn} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            A secure wrapper that protects your short links from <span className="text-indigo-400">bypass attempts</span>
          </motion.h1>

          <motion.p variants={fadeIn} className="text-lg md:text-xl text-neutral-300 max-w-2xl leading-relaxed">
            Cheap link shorteners don’t protect links. They redirect. That’s it. Bots love that.
            <br className="hidden md:block" />
            We act as a middle layer adding validation, behaviour checks, and captcha before any redirect happens.
          </motion.p>

          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Link
              href="/short"
              className="px-8 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all hover:scale-105 shadow-lg shadow-indigo-500/20 flex items-center gap-2"
            >
              Try /short <ArrowRight size={18} />
            </Link>
            <a
              href="https://t.me/happySaturday_bitch"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all hover:scale-105 font-medium"
            >
              Build something custom
            </a>
          </motion.div>

          <motion.div variants={fadeIn} className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
            <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/5 backdrop-blur-sm">
              <h2 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Zap size={18} className="text-yellow-400" /> Fast & Simple
              </h2>
              <p className="text-sm text-neutral-300">You keep your shortener. We protect it. Not simple. Not fragile.</p>
            </div>
            <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/5 backdrop-blur-sm">
              <h2 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Bot size={18} className="text-red-400" /> Bot Filtering
              </h2>
              <p className="text-sm text-neutral-300">Block direct & manual bypass attempts. Filter bot traffic before redirect.</p>
            </div>
            <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/5 backdrop-blur-sm">
              <h2 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Lock size={18} className="text-green-400" /> Captcha Protected
              </h2>
              <p className="text-sm text-neutral-300">Add captcha validation (Google or self-hosted) before passing checks.</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Security Status Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mt-32 max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Security Evolution</h2>
            <p className="text-neutral-300">We constantly evolve to stay ahead of bypassing scripts.</p>
          </div>

          <div className="relative">
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-indigo-500/50 to-transparent md:-translate-x-1/2" />

            <div className="relative space-y-12">
              <div className="relative flex flex-col md:flex-row items-center justify-between group">
                <div className="md:w-1/2 flex justify-start md:justify-end md:pr-12 mb-4 md:mb-0 pl-16 md:pl-0 w-full">
                  <div className="bg-neutral-900/80 border border-white/5 p-4 rounded-xl backdrop-blur-sm max-w-sm w-full">
                    <div className="text-indigo-400 font-mono text-xs mb-1">v1–v3</div>
                    <div className="font-semibold text-white">JS-based obfuscated redirect flow</div>
                    <div className="text-xs text-neutral-500 mt-1">Previous standard protection</div>
                  </div>
                </div>
                <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-neutral-900 border-2 border-neutral-500 rounded-full -translate-x-1/2 group-hover:border-indigo-500 group-hover:scale-125 transition-all" />
                <div className="md:w-1/2" />
              </div>

              <div className="relative flex flex-col md:flex-row items-center justify-between group">
                <div className="md:w-1/2" />
                <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-indigo-500 border-2 border-indigo-300 rounded-full -translate-x-1/2 shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
                <div className="md:w-1/2 flex justify-start md:pl-12 pl-16 w-full">
                  <div className="bg-neutral-900/80 border border-indigo-500/30 p-4 rounded-xl backdrop-blur-sm max-w-sm w-full shadow-lg shadow-indigo-900/10">
                    <div className="text-indigo-400 font-mono text-xs mb-1 flex items-center gap-2">
                      v4 (Current)
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <div className="font-semibold text-white">Captcha-backed validation</div>
                    <div className="text-xs text-neutral-300 mt-1">Google reCAPTCHA v3</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}