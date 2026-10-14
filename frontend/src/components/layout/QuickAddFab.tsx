import React from "react";
import { Plus } from "lucide-react";

interface QuickAddFabProps {
  onClick: () => void;
}

export const QuickAddFab: React.FC<QuickAddFabProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-all duration-200 active:scale-95 focus:outline-none focus:ring-4 focus:ring-indigo-500/40 group cursor-pointer"
      aria-label="Quick Add Expense"
      title="Quick Add Expense"
    >
      <Plus className="w-6 h-6 transition-transform duration-200 group-hover:rotate-90" />
    </button>
  );
};
