"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    LayoutDashboard,
    Users,
    Activity,
    Link2,
    Shield,
    ChevronLeft,
    Lock,
    Gauge
} from "lucide-react";

const sidebarLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/metrics", label: "Metrics", icon: Activity },
    { href: "/admin/ratelimit", label: "Rate Limits", icon: Gauge },
    { href: "/admin/unshorten", label: "Unshorten", icon: Link2 },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { data: session, status } = useSession();

    // Show loading state
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/10 border-t-white"></div>
            </div>
        );
    }

    // Check admin access
    if (!session?.user || (session.user as any).role !== "admin") {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-zinc-500 max-w-md">
                    This area is restricted to administrators only.
                </p>
                <Link
                    href="/"
                    className="mt-8 px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 rounded-xl transition-all"
                >
                    Back to Home
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] flex">
            {/* Sidebar */}
            <aside className="w-64 bg-zinc-950 border-r border-white/5 flex flex-col fixed h-full">
                {/* Logo/Header */}
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-white">Admin Panel</h1>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">asprin.dev</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {sidebarLinks.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? "bg-white text-black"
                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <link.icon className={`w-5 h-5 ${isActive ? "text-black" : "text-zinc-500"}`} />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Back to Main Site */}
                <div className="p-4 border-t border-white/5">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-white text-sm transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Site
                    </Link>
                </div>

                {/* User Info */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden">
                            {session.user?.image ? (
                                <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Users className="w-4 h-4 text-zinc-600" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{session.user?.name}</p>
                            <p className="text-xs text-zinc-600 truncate">{session.user?.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64">
                {children}
            </main>
        </div>
    );
}
