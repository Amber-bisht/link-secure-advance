"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Users,
    Calendar,
    Shield,
    Clock,
    CheckCircle2,
    AlertCircle,
    Plus,
    Search,
    RefreshCcw,
    Lock
} from "lucide-react";
import { format } from "date-fns";

interface User {
    _id: string;
    name: string;
    email: string;
    image?: string;
    role: string;
    validUntil: string;
    createdAt: string;
}

export default function AdminUsersPage() {
    const { data: session, status: authStatus } = useSession();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user?.role === 'admin') {
            fetchUsers();
        }
    }, [session]);

    const updateValidity = async (userId: string, days: number) => {
        try {
            setUpdatingId(userId);
            const user = users.find(u => u._id === userId);
            if (!user) return;

            const currentValidUntil = user.validUntil ? new Date(user.validUntil) : new Date();
            const newDate = new Date(Math.max(currentValidUntil.getTime(), Date.now()));
            newDate.setDate(newDate.getDate() + days);

            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, validUntil: newDate.toISOString() }),
            });

            if (res.ok) {
                await fetchUsers();
            }
        } catch (error) {
            console.error("Update failed:", error);
        } finally {
            setUpdatingId(null);
        }
    };

    if (authStatus === "loading") return null;
    if (session?.user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-zinc-500 max-w-md">
                    This area is restricted to administrators only. If you believe this is an error, please contact the system owner.
                </p>
                <button
                    onClick={() => window.location.href = "/"}
                    className="mt-8 px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 rounded-xl transition-all"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-gradient-to-br from-zinc-800 to-black border border-white/5 rounded-lg">
                                <Users className="w-6 h-6 text-zinc-400" />
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight">User Management</h1>
                        </div>
                        <p className="text-zinc-500">Manage user subscriptions and platform access</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                            <input
                                type="text"
                                placeholder="Search users by email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 pr-6 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-white/20 transition-all w-full md:w-80"
                            />
                        </div>
                        <button
                            onClick={fetchUsers}
                            className="p-3 bg-zinc-900 border border-white/5 rounded-xl hover:bg-zinc-800 transition-all"
                        >
                            <RefreshCcw className={`w-5 h-5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[
                        { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-400' },
                        { label: 'Active', value: users.filter(u => new Date(u.validUntil) > new Date()).length, icon: CheckCircle2, color: 'text-emerald-400' },
                        { label: 'Expired', value: users.filter(u => !u.validUntil || new Date(u.validUntil) <= new Date()).length, icon: AlertCircle, color: 'text-amber-400' },
                    ].map((stat, i) => (
                        <div key={i} className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                            <div className="text-3xl font-bold">{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* Users List */}
                <div className="bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Subscription Ends</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading && users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/10 border-t-white mx-auto mb-4"></div>
                                            <p className="text-zinc-500">Loading user database...</p>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center">
                                            <p className="text-zinc-500">No users found matching your search.</p>
                                        </td>
                                    </tr>
                                ) : filteredUsers.map((user) => {
                                    const isActive = user.validUntil && new Date(user.validUntil) > new Date();
                                    return (
                                        <tr key={user._id} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-6 border-b border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                        {user.image ? (
                                                            <img src={user.image} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Users className="w-5 h-5 text-zinc-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-white flex items-center gap-2">
                                                            {user.name || 'Unknown'}
                                                            {user.role === 'admin' && (
                                                                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded border border-blue-500/20 uppercase font-bold">Admin</span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-zinc-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 border-b border-white/5">
                                                {isActive ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 text-xs rounded-full border border-red-500/20">
                                                        <Clock className="w-3.5 h-3.5" /> Expired
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-6 border-b border-white/5">
                                                <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                    <Calendar className="w-4 h-4 text-zinc-500" />
                                                    {user.validUntil ? format(new Date(user.validUntil), 'PPP') : 'Never Started'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 border-b border-white/5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        disabled={updatingId === user._id}
                                                        onClick={() => updateValidity(user._id, 30)}
                                                        className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                    >
                                                        {updatingId === user._id ? (
                                                            <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Plus className="w-3.5 h-3.5" />
                                                        )}
                                                        +30 Days
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                    <div className="flex items-center gap-1.5">
                        <Shield className="w-3 h-3" /> Secure Admin Access
                    </div>
                    <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
                    <div>Powered by asprin dev</div>
                </div>
            </div>
        </div>
    );
}
