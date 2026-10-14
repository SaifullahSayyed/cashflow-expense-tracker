import React, { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { LayoutDashboard, RefreshCcw } from "lucide-react";
import { DashboardSummary } from "../api/types";
import { api } from "../api/endpoints";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { formatPaise } from "../utils/currency";
import { formatDate } from "../utils/date";
import { StatCards } from "../components/dashboard/StatCards";
import { Skeleton } from "../components/common/SkeletonLoader";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";

const PAYMENT_COLORS: Record<string, string> = {
  UPI: "#6366f1",
  card: "#0ea5e9",
  cash: "#10b981",
  other: "#64748b",
};

export const DashboardPage: React.FC = () => {
  const { currencySymbol } = useSettings();
  const { error: showError } = useToast();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSummary = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      showError("Failed to load dashboard", err.detail || err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const today = new Date();
  const monthName = today.toLocaleString("en-IN", { month: "long" });
  const year = today.getFullYear();

  /* ── Custom tooltip for Recharts ── */
  const DonutTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const p = payload[0];
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs shadow-lg">
          <p className="font-bold text-slate-800 dark:text-slate-100">{p.name}</p>
          <p className="text-slate-500 dark:text-slate-400">{formatPaise(p.value, currencySymbol)}</p>
          <p className="text-slate-400">{((p.payload.percent ?? 0) * 100).toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const LineTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs shadow-lg">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.dataKey} style={{ color: p.stroke }} className="font-bold">
              {formatPaise(p.value, currencySymbol)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {monthName} {year} — spending overview
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCcw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />}
          onClick={() => fetchSummary(true)}
          disabled={isRefreshing}
        >
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : summary ? (
        <StatCards summary={summary} />
      ) : null}

      {/* Charts row */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Spending by Category — Donut */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
              Spending by Category
            </h2>
            {summary.category_breakdown.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                No spending data for this month
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={summary.category_breakdown.map((s) => ({
                        name: s.category_name,
                        value: s.total_paise,
                        percent: s.total_paise / (summary.total_expenses_paise || 1),
                        fill: s.category_color,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {summary.category_breakdown.map((s, i) => (
                        <Cell key={i} fill={s.category_color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 flex-1 w-full">
                  {summary.category_breakdown.map((s) => (
                    <div key={s.category_name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.category_color }} />
                        <span className="text-slate-700 dark:text-slate-300 truncate">{s.category_name}</span>
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-100 ml-2 flex-shrink-0">
                        {formatPaise(s.total_paise, currencySymbol)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Daily Trend — Line Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
              Daily Spending Trend
            </h2>
            {summary.spending_trend.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                No spending data for this month
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={summary.spending_trend.map((d) => ({
                    date: new Date(d.date).getDate().toString(),
                    spent: d.total_paise,
                  }))}
                  margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${currencySymbol}${Math.round(v / 100)}`}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                  />
                  <Tooltip content={<LineTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="spent"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: "#6366f1" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      ) : null}

      {/* Recent Transactions */}
      {!isLoading && summary && summary.recent_transactions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
            Recent Transactions
          </h2>
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {summary.recent_transactions.map((tx) => (
              <div key={`${tx.type}-${tx.id}`} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: tx.category_color || "#64748b" }}
                  >
                    {(tx.description[0] || "?").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-slate-400">{formatDate(tx.date)}</span>
                      {tx.category_name && (
                        <Badge color={tx.category_color || "#64748b"} size="sm">{tx.category_name}</Badge>
                      )}
                      <Badge
                        color={PAYMENT_COLORS[tx.payment_method] || "#64748b"}
                        size="sm"
                      >
                        {tx.payment_method}
                      </Badge>
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-bold ml-2 flex-shrink-0 ${
                  tx.type === "income"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}>
                  {tx.type === "income" ? "+" : "-"}{formatPaise(tx.amount_paise, currencySymbol)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
