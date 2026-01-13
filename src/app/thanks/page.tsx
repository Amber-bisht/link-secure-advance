"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

export default function ThanksPage() {
    const [timeLeft, setTimeLeft] = useState(3);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    window.close();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-black">
            <div className="text-center p-8 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl max-w-sm w-full mx-4">
                <div className="flex justify-center mb-4">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                    Thanks for visiting!
                </h1>
                <p className="text-zinc-400 text-sm mb-4">
                    Your link is opening in the main window...
                </p>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-2 overflow-hidden">
                    <div className="bg-green-500 h-1.5 rounded-full animate-[progress_1s_linear_forwards]" style={{ width: '0%' }}></div>
                </div>
                <p className="text-xs text-zinc-600">
                    Closing in {timeLeft}s
                </p>

                <style jsx global>{`
                    @keyframes progress {
                        from { width: 0%; }
                        to { width: 100%; }
                    }
                `}</style>
            </div>
        </div>
    );
}
