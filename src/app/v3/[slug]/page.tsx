"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { decodeLinkV3 } from "@/utils/linkWrapper";

export default function RedirectPageV3() {
    const params = useParams();
    const [error, setError] = useState("");

    useEffect(() => {
        if (params.slug) {
            const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
            const decoded = decodeLinkV3(slug);

            if (decoded && /^https?:\/\//.test(decoded)) {
                // Immediate redirect without delay
                window.location.href = decoded;
            } else {
                setError("Invalid Link");
            }
        }
    }, [params.slug]);

    // If redirecting, we show virtually nothing (or just the title) to keep it simple/fast.
    // If error, we show the error.
    if (!error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-24 font-mono">
                <h1 className="text-xl font-bold">links.asprin.dev V3</h1>
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    made by{' '}
                    <a
                        href="https://t.me/happySaturday_bitch"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
                    >
                        asprin dev
                    </a>
                    {' '}- version 3
                </p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24 font-mono">
            <h1 className="text-xl font-bold mb-4">Unlocked Link Shortener V3</h1>
            <p className="text-red-500">{error}</p>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                made by{' '}
                <a
                    href="https://t.me/happySaturday_bitch"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                    unlocked
                </a>
                {' '}- version 3
            </p>
        </div>
    );
}
