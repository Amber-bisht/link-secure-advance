import { notFound } from "next/navigation";
import dbConnect from "@/lib/db";
import V41Link from "@/models/V41Link";
import RedirectClient from "./RedirectClient";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function V41RedirectPage(props: PageProps) {
    const params = await props.params;
    const { slug } = params;

    await dbConnect();

    const link = await V41Link.findOne({ slug }).lean();

    if (!link) {
        notFound();
    }

    // @ts-ignore - lean() returns plain object, but TS might complain about _id/ObjectId to string conversion if strict. 
    // We only need urls.
    return <RedirectClient slug={slug} urls={link.urls} />;
}
