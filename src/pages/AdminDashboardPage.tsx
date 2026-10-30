import { Activity, AlertCircle, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { AdminOverviewData } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useApp();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminOverview();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load administrator metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Administrator Authorization Required
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Only verified administrator accounts configured on the server may access system usage and error monitoring.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Console</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Aggregate usage metrics, AI request counts, system health, and anonymized error logs.
          </p>
        </div>
        <button
          type="button"
          onClick={loadOverview}
          disabled={loading}
          className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold inline-flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Registered Users</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {data.totalRegisteredUsers}
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                {data.totalConversations} saved threads · {data.totalStoredMessages} messages
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Total AI Requests</span>
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {data.metrics.totalAiRequests}
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                {data.metrics.authenticatedAiRequests} signed-in · {data.metrics.guestAiRequests} guest
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <span className="text-xs text-slate-500">System Health</span>
              <p className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                {data.systemHealth.status}
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                Uptime {Math.floor(data.systemHealth.uptimeSeconds / 60)}m · {data.systemHealth.memoryRssMb} MB RAM
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <span className="text-xs text-slate-500">Gemini Configuration</span>
              <p className="mt-2 text-base font-bold font-mono text-slate-900 dark:text-white truncate">
                {data.systemHealth.geminiModel}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                API Key · {data.systemHealth.geminiConfigured ? 'Configured' : 'Missing'}
              </p>
            </div>
          </div>

          {/* Endpoint Breakdown & Recent Errors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h2 className="text-base font-semibold mb-4">AI Requests by Endpoint</h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {Object.entries(data.metrics.byEndpoint).map(([endpoint, count]) => (
                  <div key={endpoint} className="py-2.5 flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      /api/{endpoint === 'analyzeImage' ? 'analyze-image' : endpoint}
                    </span>
                    <span className="font-mono font-semibold tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h2 className="text-base font-semibold mb-4">Error Monitoring (Recent)</h2>
              {data.metrics.recentErrors.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No API or system errors recorded.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                        <th className="pb-2 font-medium">Endpoint</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Code</th>
                        <th className="pb-2 font-medium text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.metrics.recentErrors.slice(0, 8).map((errItem) => (
                        <tr key={errItem.id}>
                          <td className="py-2 font-mono">{errItem.endpoint}</td>
                          <td className="py-2 font-mono tabular-nums text-red-600 dark:text-red-400">
                            {errItem.statusCode}
                          </td>
                          <td className="py-2">{errItem.code}</td>
                          <td className="py-2 text-right tabular-nums text-slate-500">
                            {new Date(errItem.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
