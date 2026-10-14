import React from "react";
import { PieChart } from "lucide-react";

export const BudgetsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <PieChart className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Budgets
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Set monthly category limits and monitor your spending thresholds
        </p>
      </div>
    </div>
  );
};
