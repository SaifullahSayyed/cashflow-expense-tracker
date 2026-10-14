import React from "react";
import { LayoutDashboard } from "lucide-react";

export const DashboardPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Overview of your monthly spending, income, and financial health
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Placeholder cards for Phase 2 shell */}
        {["Total Spent", "Total Income", "Net Balance", "Top Category"].map((item, idx) => (
          <div
            key={idx}
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item}</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">--</p>
          </div>
        ))}
      </div>
    </div>
  );
};
