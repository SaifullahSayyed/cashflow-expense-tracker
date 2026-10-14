import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  color?: string; // Hex color code
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  color,
  size = "md",
}) => {
  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  if (color) {
    // If explicit hex color is passed
    return (
      <span
        style={{
          backgroundColor: `${color}20`,
          color: color,
          borderColor: `${color}40`,
        }}
        className={`inline-flex items-center font-medium rounded-full border ${sizeStyles[size]}`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        {children}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
};
