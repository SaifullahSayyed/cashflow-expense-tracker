import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, Plus, Search, Pencil, Trash2,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Income, PaginatedResponse } from "../api/types";
import { api } from "../api/endpoints";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { formatPaise } from "../utils/currency";
import { formatDate } from "../utils/date";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { Skeleton } from "../components/common/SkeletonLoader";
import { IncomeFormModal } from "../components/income/IncomeFormModal";
import { Badge } from "../components/common/Badge";

const SOURCE_COLORS: Record<string, string> = {
  Salary: "#10b981",
  Freelance: "#6366f1",
  Business: "#f97316",
  Investment: "#0ea5e9",
  Gift: "#ec4899",
  Rental: "#8b5cf6",
  Other: "#64748b",
};

export const IncomePage: React.FC = () => {
  const { currencySymbol } = useSettings();
  const { success, error: showError } = useToast();

  const [data, setData] = useState<PaginatedResponse<Income> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const fetchIncome = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.getIncome({
        page,
        page_size: 20,
        search: debouncedSearch || undefined,
      });
      setData(result);
    } catch (err: any) {
      showError("Failed to load income", err.detail || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, showError]);

  useEffect(() => { fetchIncome(); }, [fetchIncome]);

  const handleDelete = async (income: Income) => {
    if (!confirm(`Delete "${income.description}"? This cannot be undone.`)) return;
    setDeletingId(income.id);
    try {
      await api.deleteIncome(income.id);
      success("Income entry deleted");
      fetchIncome();
    } catch (err: any) {
      showError("Delete failed", err.detail || err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Compute month total
  const totalPaise = data?.items.reduce((sum, i) => sum + i.amount_paise, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Income
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record salary, freelancing, investments, and other cash inflows
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => { setEditingIncome(null); setIsFormOpen(true); }}
        >
          Record Income
        </Button>
      </div>

      {/* Summary card */}
      {data && data.total > 0 && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
            Visible on this page
          </p>
          <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
            {formatPaise(totalPaise, currencySymbol)}
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search income entries…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_120px_100px_100px_80px] gap-4 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          <span>Description</span>
          <span>Date</span>
          <span>Source</span>
          <span>Amount</span>
          <span>Actions</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No income entries yet"
            description={debouncedSearch ? "No entries match your search" : "Start logging your income to track your net balance"}
            actionText="Record Income"
            onAction={() => { setEditingIncome(null); setIsFormOpen(true); }}
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.items.map((item) => (
              <div
                key={item.id}
                className="grid sm:grid-cols-[1fr_120px_100px_100px_80px] gap-2 sm:gap-4 px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.description}</p>
                  <div className="sm:hidden mt-1 flex items-center gap-2">
                    <Badge color={SOURCE_COLORS[item.source] || "#64748b"} size="sm">{item.source}</Badge>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 ml-auto">
                      +{formatPaise(item.amount_paise, currencySymbol)}
                    </span>
                  </div>
                </div>
                <span className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">{formatDate(item.date)}</span>
                <div className="hidden sm:block">
                  <Badge color={SOURCE_COLORS[item.source] || "#64748b"} size="sm">{item.source}</Badge>
                </div>
                <span className="hidden sm:block text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatPaise(item.amount_paise, currencySymbol)}
                </span>
                <div className="flex items-center gap-1 justify-end sm:justify-start">
                  <button
                    onClick={() => { setEditingIncome(item); setIsFormOpen(true); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, data.total)} of <strong>{data.total}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-medium">Page {page} / {data.total_pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page >= data.total_pages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <IncomeFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingIncome(null); }}
        incomeToEdit={editingIncome}
        onSuccess={fetchIncome}
      />
    </div>
  );
};
