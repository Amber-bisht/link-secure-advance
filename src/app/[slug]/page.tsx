"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { decodeLink } from "@/utils/linkWrapper";

export default function RedirectPage() {
    const params = useParams();
    const [error, setError] = useState("");

    useEffect(() => {
        if (params.slug) {
            const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
            const decoded = decodeLink(slug);

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
            <div className="flex min-h-screen items-center justify-center p-24 font-mono">
                <h1 className="text-xl font-bold"> UC Link Shortener</h1>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24 font-mono">
            <h1 className="text-xl font-bold mb-4"> Unlocked Coding Link Shortener</h1>
            <p className="text-red-500">{error}</p>
        </div>
    );
}
