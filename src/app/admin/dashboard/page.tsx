import { auth } from '@/auth';
import { getCaptchaMetrics } from '@/lib/captcha-metrics';
import { Activity, Clock, Users, AlertTriangle } from 'lucide-react';

export default async function AdminDashboard() {
    const session = await auth();
    const data = await getCaptchaMetrics();

    return (
        <div className="p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                            Security Dashboard
                        </h1>
                        <p className="text-neutral-400 mt-2">Real-time captcha system metrics</p>
                    </div>
                    <div className="px-4 py-2 bg-neutral-900 rounded-full border border-neutral-800 text-sm md:text-base">
                        Status: {data ? <span className="text-green-400">Online</span> : <span className="text-red-400">Unreachable</span>}
                    </div>
                </header>

                {!data ? (
                    <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200">
                        Failed to load metrics. Check API connection and Admin Key.
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="Total Verifications"
                                value={data.metrics.totals.verifications}
                                icon={<Activity className="text-blue-400" />}
                                subtext={`${data.metrics.totals.successRate}% success rate`}
                            />
                            <StatCard
                                title="Avg Solve Time"
                                value={`${data.metrics.performance.avgSolveTimeMs}ms`}
                                icon={<Clock className="text-green-400" />}
                                subtext="Performance"
                            />
                            <StatCard
                                title="Unique Users"
                                value={data.metrics.security.uniqueDailyFingerprints}
                                icon={<Users className="text-purple-400" />}
                                subtext="Daily Fingerprints"
                            />
                            <StatCard
                                title="Security Events"
                                value={data.metrics.security.replays + data.metrics.security.timingAttacks}
                                icon={<AlertTriangle className="text-red-400" />}
                                subtext={`${data.metrics.security.honeypotTriggered} honeypots / ${data.metrics.security.bannedAttempts} banned`}
                            />
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
                                <Clock className="w-5 h-5 text-neutral-400" />
                                Hourly Activity (Last 24h)
                            </h2>

                            <div className="h-64 flex items-end justify-between gap-2">
                                {data.hourlyStats?.map((stat: any, i: number) => {
                                    const total = stat.success + stat.fail;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                            <div className="w-full bg-neutral-800 rounded-t relative overflow-hidden group-hover:bg-neutral-700 transition-colors"
                                                style={{ height: `${Math.max((total / 100) * 100, 5)}%` }}>
                                                <div className="absolute bottom-0 w-full bg-blue-500/50" style={{ height: total > 0 ? `${(stat.success / total) * 100}%` : '0%' }}></div>
                                            </div>
                                            <span className="text-xs text-neutral-500">{new Date(stat.hour).getHours()}h</span>
                                        </div>
                                    );
                                })}
                                {(!data.hourlyStats || data.hourlyStats.length === 0) && (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-500">
                                        No hourly data available
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, subtext }: any) {
    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-neutral-400 text-sm font-medium">{title}</p>
                    <h3 className="text-2xl font-bold mt-2 text-white">{value}</h3>
                </div>
                <div className="p-2 bg-neutral-950 rounded-lg">{icon}</div>
            </div>
            <p className="text-xs text-neutral-500 mt-4">{subtext}</p>
        </div>
    );
}
