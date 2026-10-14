import React from "react";
import { TrendingUp, TrendingDown, Wallet, Tag } from "lucide-react";
import { DashboardSummary } from "../../api/types";
import { formatPaise } from "../../utils/currency";
import { useSettings } from "../../context/SettingsContext";

interface StatCardsProps {
  summary: DashboardSummary;
}

export const StatCards: React.FC<StatCardsProps> = ({ summary }) => {
  const { currencySymbol } = useSettings();
  const isPositive = summary.net_balance_paise >= 0;

  const cards = [
    {
      label: "Total Spent",
      value: formatPaise(summary.total_expenses_paise, currencySymbol),
      icon: <TrendingDown className="w-5 h-5" />,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/40",
      border: "border-rose-200 dark:border-rose-900",
    },
    {
      label: "Total Income",
      value: formatPaise(summary.total_income_paise, currencySymbol),
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-200 dark:border-emerald-900",
    },
    {
      label: "Net Balance",
      value: `${isPositive ? "+" : ""}${formatPaise(summary.net_balance_paise, currencySymbol)}`,
      icon: <Wallet className="w-5 h-5" />,
      color: isPositive
        ? "text-indigo-600 dark:text-indigo-400"
        : "text-rose-600 dark:text-rose-400",
      bg: isPositive
        ? "bg-indigo-50 dark:bg-indigo-950/40"
        : "bg-rose-50 dark:bg-rose-950/40",
      border: isPositive
        ? "border-indigo-200 dark:border-indigo-900"
        : "border-rose-200 dark:border-rose-900",
    },
    {
      label: "Top Category",
      value: summary.top_category ? summary.top_category.category_name : "—",
      subValue: summary.top_category
        ? formatPaise(summary.top_category.total_paise, currencySymbol)
        : undefined,
      icon: <Tag className="w-5 h-5" />,
      color: summary.top_category
        ? undefined
        : "text-slate-400 dark:text-slate-500",
      customColor: summary.top_category?.category_color,
      bg: "bg-white dark:bg-slate-900",
      border: "border-slate-200 dark:border-slate-800",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${card.bg} ${card.border}`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {card.label}
            </p>
            <div
              className={card.customColor ? undefined : card.color}
              style={card.customColor ? { color: card.customColor } : undefined}
            >
              {card.icon}
            </div>
          </div>
          <p
            className={`text-lg sm:text-xl font-extrabold truncate ${
              card.customColor ? "" : card.color || "text-slate-900 dark:text-slate-100"
            }`}
            style={card.customColor ? { color: card.customColor } : undefined}
          >
            {card.value}
          </p>
          {card.subValue && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.subValue}</p>
          )}
        </div>
      ))}
    </div>
  );
};
