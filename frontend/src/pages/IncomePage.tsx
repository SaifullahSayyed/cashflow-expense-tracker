import React from "react";
import { TrendingUp } from "lucide-react";

export const IncomePage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          Income
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Record salary, freelancing, investments, and other cash inflows
        </p>
      </div>
    </div>
  );
};
