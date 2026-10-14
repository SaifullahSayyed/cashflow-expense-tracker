import React from "react";
import { Tags } from "lucide-react";

export const CategoriesPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Tags className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Categories
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Organize your expenses with default and custom color-coded categories
        </p>
      </div>
    </div>
  );
};
