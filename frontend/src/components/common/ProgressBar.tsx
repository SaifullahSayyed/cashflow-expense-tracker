import React from "react";

export interface ProgressBarProps {
  percentage: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  showLabel = false,
  size = "md",
}) => {
  const clamped = Math.max(0, Math.min(percentage, 100));

  let barColor = "bg-indigo-600 dark:bg-indigo-500";
  if (percentage >= 100) {
    barColor = "bg-rose-500 dark:bg-rose-600";
  } else if (percentage >= 80) {
    barColor = "bg-amber-500 dark:bg-amber-600";
  }

  const heightStyles = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3.5",
  };

  return (
    <div className="w-full flex flex-col gap-1">
      <div className={`w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${heightStyles[size]}`}>
        <div
          className={`${barColor} h-full rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center text-xs">
          <span
            className={`font-semibold ${
              percentage >= 100
                ? "text-rose-600 dark:text-rose-400"
                : percentage >= 80
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {percentage.toFixed(1)}% used
          </span>
          {percentage >= 100 && (
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
              Budget Exceeded!
            </span>
          )}
          {percentage >= 80 && percentage < 100 && (
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              Near Limit (80%+)
            </span>
          )}
        </div>
      )}
    </div>
  );
};
