import { auth } from "@/auth";
import V41Link from "@/models/V41Link";
import User from "@/models/User";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { url, slug } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        if (!slug) {
            return NextResponse.json({ error: "Slug is required" }, { status: 400 });
        }

        // Connect to DB
        await mongoose.connect(process.env.MONGODB_URI as string);

        // Fetch User Keys
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if at least one key exists (or enforce strictness based on requirements)
        // Flow says: "only if key exist - at least 1 key"
        if (!user.linkShortifyKey && !user.aroLinksKey && !user.vpLinkKey && !user.inShortUrlKey) {
            return NextResponse.json({ error: "No API keys found. Please add keys in Settings first." }, { status: 400 });
        }

        // Check availability
        const existing = await V41Link.findOne({ slug });
        if (existing) {
            return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
        }

        // Parallel API Calls
        const promises = [];

        // Helper to fetch
        const shorten = async (serviceName: string, apiUrl: string): Promise<string | null> => {
            try {
                // Replace placeholders
                // URL Format from flow.md:
                // LinkShortify: https://linkshortify.com/api?api=${key}&url=${url}&format=text
                // AroLinks: https://arolinks.com/api?api=${key}&url=${url}&alias=TestAlias&format=text (Alias ignored for now as we want random or auto from them?)
                // Actually flow says: alias=TestAlias. But we can't reuse same alias on their system probably? 
                // Let's drop alias param for safety or use our slug if they support it? 
                // Flow examples show alias=TestAlias for Aro, VP, InShort. Ideally we shouldn't force alias unless user wants.
                // Let's try WITHOUT alias first to avoid conflicts on their end, or use simple format.

                const res = await fetch(apiUrl);
                if (!res.ok) return null;
                const text = await res.text();
                if (text.startsWith("http")) return text.trim();
                return null;
            } catch (e) {
                console.error(`Failed to shorten with ${serviceName}`, e);
                return null;
            }
        };

        let linkShortifyUrl = "";
        let aroLinksUrl = "";
        let vpLinkUrl = "";
        let inShortUrlUrl = "";

        // 1. LinkShortify
        if (user.linkShortifyKey) {
            promises.push(shorten('LinkShortify', `https://linkshortify.com/api?api=${user.linkShortifyKey}&url=${encodeURIComponent(url)}&format=text`)
                .then(res => { if (res) linkShortifyUrl = res; }));
        }

        // 2. AroLinks
        if (user.aroLinksKey) {
            promises.push(shorten('AroLinks', `https://arolinks.com/api?api=${user.aroLinksKey}&url=${encodeURIComponent(url)}&format=text`) // Removed alias to let it generate unique
                .then(res => { if (res) aroLinksUrl = res; }));
        }

        // 3. VPLink
        if (user.vpLinkKey) {
            promises.push(shorten('VPLink', `https://vplink.in/api?api=${user.vpLinkKey}&url=${encodeURIComponent(url)}&format=text`)
                .then(res => { if (res) vpLinkUrl = res; }));
        }

        // 4. InShortUrl
        if (user.inShortUrlKey) {
            promises.push(shorten('InShortUrl', `https://inshorturl.com/api?api=${user.inShortUrlKey}&url=${encodeURIComponent(url)}&format=text`)
                .then(res => { if (res) inShortUrlUrl = res; }));
        }

        await Promise.all(promises);

        // Fallback or Error if ALL failed despite having keys?
        // "if not exist show error" - well we showed error if keys missing.
        // If keys exist but API fails, we might still want to proceed if at least ONE succeeded?
        // Let's proceed if we have at least one URL, or maybe just save what we have.

        // Construct legacy urls array for compatibility/ordering
        // Order: LinkShortify, AroLinks, VPLink, InShortUrl
        const urlsList = [];
        if (linkShortifyUrl) urlsList.push(linkShortifyUrl);
        if (aroLinksUrl) urlsList.push(aroLinksUrl);
        if (vpLinkUrl) urlsList.push(vpLinkUrl);
        if (inShortUrlUrl) urlsList.push(inShortUrlUrl);

        if (urlsList.length === 0) {
            return NextResponse.json({ error: "Failed to generate any short links. Please check your API keys or try again." }, { status: 500 });
        }

        const newLink = await V41Link.create({
            slug,
            originalUrl: url,
            linkShortifyUrl,
            aroLinksUrl,
            vpLinkUrl,
            inShortUrlUrl,
            urls: urlsList,
            ownerId: session.user.id,
        });

        // Increment usage count
        await User.updateOne(
            { email: session.user.email },
            { $inc: { howmanycreatedlinks: 1 } }
        );

        return NextResponse.json({ success: true, link: newLink }, { status: 201 });
    } catch (error) {
        console.error("Error creating v4.1 link:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
