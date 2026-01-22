"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
    Shield,
    Activity,
    AlertTriangle,
    RefreshCw,
    TrendingUp,
    Clock,
    BarChart3
} from "lucide-react";

interface MetricsData {
    success: boolean;
    timestamp: string;
    metrics: {
        totals: {
            challenges: number;
            verifications: number;
            successRate: number;
        };
        byType: {
            spatial: { success: number; fail: number };
            text: { success: number; fail: number };
        };
        security: {
            bannedAttempts: number;
            honeypotTriggered: number;
            fingerprintAnomalies: number;
            uniqueDailyFingerprints: number;
            replays: number;
            timingAttacks: number;
        };
        performance: {
            avgSolveTimeMs: number;
        };
    };
    hourlyStats: Array<{
        hour: string;
        success: number;
        fail: number;
        rate: number;
    }>;
}

export default function MetricsPage() {
    const { data: session } = useSession();
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/metrics");
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch metrics");
            }

            setMetrics(data);
            setLastRefresh(new Date());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session?.user) {
            fetchMetrics();
            const interval = setInterval(fetchMetrics, 30000);
            return () => clearInterval(interval);
        }
    }, [session, fetchMetrics]);

    return (
        <div className="p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 rounded-xl">
                            <BarChart3 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">CAPTCHA Metrics</h1>
                            <p className="text-zinc-500">Real-time security monitoring dashboard</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchMetrics}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-sm text-zinc-300 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {lastRefresh && (
                    <p className="text-xs text-zinc-600 mb-6">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </p>
                )}

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 mb-6">
                        <AlertTriangle className="w-5 h-5" />
                        <p>{error}</p>
                    </div>
                )}

                {loading && !metrics && (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                )}

                {metrics && (
                    <div className="space-y-6">
                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                    <span className={`text-3xl font-bold ${metrics.metrics.totals.successRate >= 70 ? 'text-emerald-400' :
                                        metrics.metrics.totals.successRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                        {metrics.metrics.totals.successRate}%
                                    </span>
                                </div>
                                <p className="text-zinc-500 text-sm">Success Rate</p>
                            </div>

                            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <Activity className="w-5 h-5 text-blue-400" />
                                    <span className="text-3xl font-bold text-white">
                                        {metrics.metrics.totals.verifications.toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-zinc-500 text-sm">Total Verifications</p>
                            </div>

                            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <Clock className="w-5 h-5 text-purple-400" />
                                    <span className="text-3xl font-bold text-white">
                                        {(metrics.metrics.performance.avgSolveTimeMs / 1000).toFixed(1)}s
                                    </span>
                                </div>
                                <p className="text-zinc-500 text-sm">Avg Solve Time</p>
                            </div>

                            {/* Fingerprint Entropy - New KPI */}
                            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <Shield className="w-5 h-5 text-cyan-400" />
                                    <span className="text-3xl font-bold text-cyan-400">
                                        {metrics.metrics.security.uniqueDailyFingerprints}
                                    </span>
                                </div>
                                <p className="text-zinc-500 text-sm">Unique Fingerprints (24h)</p>
                            </div>
                        </div>

                        {/* Security Analysis & Event Log */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Security Events Overview */}
                            <div className="lg:col-span-2 bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">Security Threats</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="bg-black/40 rounded-xl p-4 border border-red-500/10">
                                        <div className="text-2xl font-bold text-red-500 mb-1">
                                            {metrics.metrics.security.bannedAttempts}
                                        </div>
                                        <p className="text-xs text-zinc-500">Banned Devices</p>
                                    </div>
                                    <div className="bg-black/40 rounded-xl p-4 border border-orange-500/10">
                                        <div className="text-2xl font-bold text-orange-400 mb-1">
                                            {metrics.metrics.security.honeypotTriggered}
                                        </div>
                                        <p className="text-xs text-zinc-500">Honeypot Hits</p>
                                    </div>
                                    <div className="bg-black/40 rounded-xl p-4 border border-red-500/10">
                                        <div className="text-2xl font-bold text-red-400 mb-1">
                                            {metrics.metrics.security.replays}
                                        </div>
                                        <p className="text-xs text-zinc-500">Token Replays</p>
                                    </div>
                                    <div className="bg-black/40 rounded-xl p-4 border border-yellow-500/10">
                                        <div className="text-2xl font-bold text-yellow-400 mb-1">
                                            {metrics.metrics.security.timingAttacks || 0}
                                        </div>
                                        <p className="text-xs text-zinc-500">Timing Attacks</p>
                                    </div>
                                </div>
                            </div>

                            {/* Challenge Distribution */}
                            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">Pass Rate by Type</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-zinc-300">Spatial</span>
                                        <span className="text-emerald-400 font-mono">
                                            {metrics.metrics.byType.spatial.success + metrics.metrics.byType.spatial.fail > 0
                                                ? Math.round((metrics.metrics.byType.spatial.success / (metrics.metrics.byType.spatial.success + metrics.metrics.byType.spatial.fail)) * 100)
                                                : 0}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-zinc-800 rounded-full h-2">
                                        <div
                                            className="bg-purple-500 h-2 rounded-full"
                                            style={{
                                                width: `${metrics.metrics.byType.spatial.success + metrics.metrics.byType.spatial.fail > 0
                                                    ? (metrics.metrics.byType.spatial.success / (metrics.metrics.byType.spatial.success + metrics.metrics.byType.spatial.fail)) * 100
                                                    : 0}%`
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-sm mb-1 mt-4">
                                        <span className="text-zinc-300">Text</span>
                                        <span className="text-emerald-400 font-mono">
                                            {metrics.metrics.byType.text.success + metrics.metrics.byType.text.fail > 0
                                                ? Math.round((metrics.metrics.byType.text.success / (metrics.metrics.byType.text.success + metrics.metrics.byType.text.fail)) * 100)
                                                : 0}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-zinc-800 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full"
                                            style={{
                                                width: `${metrics.metrics.byType.text.success + metrics.metrics.byType.text.fail > 0
                                                    ? (metrics.metrics.byType.text.success / (metrics.metrics.byType.text.success + metrics.metrics.byType.text.fail)) * 100
                                                    : 0}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hourly Volume Chart */}
                        <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">Traffic Volume (24h)</h3>
                            <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
                                {metrics.hourlyStats.map((stat, i) => {
                                    const maxVal = Math.max(...metrics.hourlyStats.map(s => s.success + s.fail), 1);
                                    const height = ((stat.success + stat.fail) / maxVal) * 100;
                                    const successHeight = stat.success + stat.fail > 0
                                        ? (stat.success / (stat.success + stat.fail)) * height
                                        : 0;

                                    return (
                                        <div key={i} className="flex-1 min-w-[10px] flex flex-col items-center group relative">
                                            <div
                                                className="w-full rounded-t-sm bg-red-500/50 relative transition-all group-hover:bg-red-500/70"
                                                style={{ height: `${height}%` }}
                                            >
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-sm transition-all group-hover:bg-emerald-400"
                                                    style={{ height: `${successHeight}%` }}
                                                />
                                            </div>
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black border border-zinc-800 p-2 rounded text-xs whitespace-nowrap z-10">
                                                <div className="font-bold">{new Date(stat.hour).getHours()}:00</div>
                                                <div className="text-emerald-400">Success: {stat.success}</div>
                                                <div className="text-red-400">Fail: {stat.fail}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-zinc-600">
                                <span>24h ago</span>
                                <span>Now</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
