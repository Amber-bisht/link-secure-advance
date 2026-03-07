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
            <div className="flex min-h-screen flex-col items-center justify-center p-24 font-mono bg-black text-white selection:bg-purple-500/30">
                <h1 className="text-xl font-bold">links.asprin.dev V3</h1>
                <p className="mt-4 text-sm text-zinc-500">
                    made by{' '}
                    
                    {' '}- version 3
                </p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24 font-mono bg-black text-white selection:bg-purple-500/30">
            <h1 className="text-xl font-bold mb-4">Link Shortener V3</h1>
            <p className="text-red-400">{error}</p>
            <p className="mt-4 text-sm text-zinc-500">
                made by{' '}
                
                {' '}- version 3
            </p>
        </div>
    );
}
