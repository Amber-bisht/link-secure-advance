"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Gauge,
    RefreshCw,
    Save,
    AlertCircle,
    Check,
    Clock,
    Zap
} from "lucide-react";

interface RateLimitConfig {
    _id: string;
    endpoint: string;
    windowMs: number;
    maxRequests: number;
    message: string;
    isActive: boolean;
    updatedAt: string;
}

export default function RateLimitPage() {
    const { data: session } = useSession();
    const [configs, setConfigs] = useState<RateLimitConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{
        windowMs: number;
        maxRequests: number;
        message: string;
    }>({ windowMs: 0, maxRequests: 0, message: "" });

    const fetchConfigs = async () => {
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/ratelimit");
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch");
            }

            setConfigs(data.configs || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user) {
            fetchConfigs();
        }
    }, [session]);

    const startEditing = (config: RateLimitConfig) => {
        setEditingId(config._id);
        setEditValues({
            windowMs: config.windowMs,
            maxRequests: config.maxRequests,
            message: config.message
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditValues({ windowMs: 0, maxRequests: 0, message: "" });
    };

    const saveConfig = async (config: RateLimitConfig) => {
        setSaving(config._id);
        setError("");
        setSuccess("");

        try {
            const res = await fetch("/api/admin/ratelimit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    endpoint: config.endpoint,
                    ...editValues
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to save");
            }

            setSuccess(`Updated ${config.endpoint} rate limit`);
            setEditingId(null);
            await fetchConfigs();

            setTimeout(() => setSuccess(""), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(null);
        }
    };

    const formatWindow = (ms: number) => {
        const minutes = ms / 60000;
        if (minutes >= 60) return `${(minutes / 60).toFixed(0)} hour${minutes >= 120 ? 's' : ''}`;
        return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    };

    return (
        <div className="p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 rounded-xl">
                            <Gauge className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white">Rate Limits</h1>
                            <p className="text-zinc-500">Configure CAPTCHA endpoint throttling</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchConfigs}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-sm text-zinc-300 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 mb-6">
                        <AlertCircle className="w-5 h-5" />
                        <p>{error}</p>
                    </div>
                )}

                {success && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 mb-6">
                        <Check className="w-5 h-5" />
                        <p>{success}</p>
                    </div>
                )}

                {/* Loading */}
                {loading && configs.length === 0 && (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                    </div>
                )}

                {/* Configs */}
                {!loading && configs.length === 0 && (
                    <div className="text-center py-20 text-zinc-500">
                        No rate limit configurations found.
                    </div>
                )}

                <div className="space-y-4">
                    {configs.map((config) => (
                        <div key={config._id} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-black/40 rounded-lg">
                                        <Zap className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{config.endpoint}</h3>
                                        <p className="text-xs text-zinc-500">
                                            Updated: {new Date(config.updatedAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {editingId === config._id ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={cancelEditing}
                                            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => saveConfig(config)}
                                            disabled={saving === config._id}
                                            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                                        >
                                            {saving === config._id ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Save className="w-3 h-3" />
                                            )}
                                            Save
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => startEditing(config)}
                                        className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-white/5 transition-all"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>

                            {editingId === config._id ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-2">
                                            <Clock className="w-3 h-3 inline mr-1" />
                                            Window (ms)
                                        </label>
                                        <input
                                            type="number"
                                            value={editValues.windowMs}
                                            onChange={(e) => setEditValues({ ...editValues, windowMs: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500/50"
                                        />
                                        <p className="text-[10px] text-zinc-600 mt-1">
                                            = {formatWindow(editValues.windowMs)}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-2">
                                            <Zap className="w-3 h-3 inline mr-1" />
                                            Max Requests
                                        </label>
                                        <input
                                            type="number"
                                            value={editValues.maxRequests}
                                            onChange={(e) => setEditValues({ ...editValues, maxRequests: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-2">
                                            Error Message
                                        </label>
                                        <input
                                            type="text"
                                            value={editValues.message}
                                            onChange={(e) => setEditValues({ ...editValues, message: e.target.value })}
                                            className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500/50"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                                        <div className="text-2xl font-bold text-white mb-1">
                                            {formatWindow(config.windowMs)}
                                        </div>
                                        <p className="text-xs text-zinc-500">Time Window</p>
                                    </div>
                                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                                        <div className="text-2xl font-bold text-orange-400 mb-1">
                                            {config.maxRequests}
                                        </div>
                                        <p className="text-xs text-zinc-500">Max Requests</p>
                                    </div>
                                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                                        <div className="text-sm font-medium text-zinc-300 mb-1 truncate">
                                            {config.message}
                                        </div>
                                        <p className="text-xs text-zinc-500">Error Message</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Info */}
                <div className="mt-8 p-4 bg-zinc-900/20 border border-white/5 rounded-xl">
                    <p className="text-xs text-zinc-500">
                        <strong className="text-zinc-400">Note:</strong> Rate limits are stored in MongoDB and cached in Redis.
                        Changes take effect immediately across all server instances.
                    </p>
                </div>
            </div>
        </div>
    );
}
