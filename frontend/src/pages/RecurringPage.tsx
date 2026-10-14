import React from "react";
import { Repeat } from "lucide-react";

export const RecurringPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Repeat className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Recurring Expenses
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage subscriptions, rent, and rules that auto-generate on schedule
        </p>
      </div>
    </div>
  );
};
