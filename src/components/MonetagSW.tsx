"use client";

import { useEffect } from "react";

export function MonetagSW() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("Monetag SW registered successfully:", registration.scope);
                })
                .catch((error) => {
                    console.error("Monetag SW registration failed:", error);
                });
        }
    }, []);

    return null;
}
