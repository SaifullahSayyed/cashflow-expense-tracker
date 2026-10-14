import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Download,
  Upload,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { Expense, Category, PaginatedResponse } from "../../api/types";
import { api } from "../../api/endpoints";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { formatPaise } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { Skeleton } from "../common/SkeletonLoader";
import { Modal } from "../common/Modal";
import { CsvImportPanel } from "../import/CsvImportPanel";

interface ExpenseTableProps {
  categories: Category[];
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  refreshTrigger: number;
}

const PAYMENT_COLORS: Record<string, string> = {
  UPI: "#6366f1",
  card: "#0ea5e9",
  cash: "#10b981",
  other: "#64748b",
};

const PAGE_SIZES = [10, 20, 50];

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  categories,
  onAddExpense,
  onEditExpense,
  refreshTrigger,
}) => {
  const { currencySymbol } = useSettings();
  const { success, error: showError } = useToast();

  const [data, setData] = useState<PaginatedResponse<Expense> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount_paise">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategories, selectedPaymentMethods, startDate, endDate, sortBy, sortOrder]);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.getExpenses({
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        category_id: selectedCategories.length ? selectedCategories : undefined,
        payment_method: selectedPaymentMethods.length ? selectedPaymentMethods : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setData(result);
    } catch (err: any) {
      showError("Failed to load expenses", err.detail || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch, selectedCategories, selectedPaymentMethods, startDate, endDate, sortBy, sortOrder, showError]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses, refreshTrigger]);

  const handleDelete = async (expense: Expense) => {
    if (!confirm(`Delete "${expense.description}"? This cannot be undone.`)) return;
    setDeletingId(expense.id);
    try {
      await api.deleteExpense(expense.id);
      success("Expense deleted", `"${expense.description}" removed`);
      fetchExpenses();
    } catch (err: any) {
      showError("Delete failed", err.detail || err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const togglePayment = (method: string) => {
    setSelectedPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const toggleSort = (col: "date" | "amount_paise") => {
    if (sortBy === col) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };

  const handleExport = () => {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (debouncedSearch) params.search = debouncedSearch;
    const url = api.getExportUrl(params);
    window.open(url, "_blank");
  };

  const paymentMethods = ["UPI", "card", "cash", "other"];

  return (
    <div className="flex flex-col gap-4">
      {/* Search + Export row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses by description or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors placeholder-slate-400"
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => setIsImportModalOpen(true)}>
            Import CSV
          </Button>
          <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>
            Export CSV
          </Button>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={onAddExpense}>
            Add Expense
          </Button>
        </div>
      </div>

      {/* Date range filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold">Date:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(""); setEndDate(""); }}
            className="text-xs text-rose-500 hover:text-rose-700 font-medium"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const isSelected = selectedCategories.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              style={isSelected ? { backgroundColor: cat.color + "25", borderColor: cat.color, color: cat.color } : {}}
              className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${
                isSelected
                  ? "shadow-sm"
                  : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Payment method filter */}
      <div className="flex flex-wrap gap-1.5">
        {paymentMethods.map((method) => {
          const isSelected = selectedPaymentMethods.includes(method);
          return (
            <button
              key={method}
              onClick={() => togglePayment(method)}
              style={isSelected ? { backgroundColor: PAYMENT_COLORS[method] + "25", borderColor: PAYMENT_COLORS[method], color: PAYMENT_COLORS[method] } : {}}
              className={`text-xs px-3 py-1 rounded-full border font-semibold uppercase tracking-wide transition-all ${
                isSelected ? "shadow-sm" : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300"
              }`}
            >
              {method}
            </button>
          );
        })}
        {selectedPaymentMethods.length > 0 && (
          <button onClick={() => setSelectedPaymentMethods([])} className="text-xs text-rose-500 hover:text-rose-700 font-medium">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-[1fr_120px_100px_100px_80px] gap-4 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          <span>Description</span>
          <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Date <ArrowUpDown className="w-3 h-3" />
          </button>
          <span>Category</span>
          <button onClick={() => toggleSort("amount_paise")} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Amount <ArrowUpDown className="w-3 h-3" />
          </button>
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
            title="No expenses found"
            description={
              debouncedSearch || selectedCategories.length || selectedPaymentMethods.length
                ? "Try adjusting your filters or search terms"
                : "Add your first expense using the button above"
            }
            actionText="Add Expense"
            onAction={onAddExpense}
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.items.map((expense) => (
              <div
                key={expense.id}
                className="grid sm:grid-cols-[1fr_120px_100px_100px_80px] gap-2 sm:gap-4 px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors items-center"
              >
                {/* Description + Notes */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {expense.description}
                  </p>
                  {expense.notes && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{expense.notes}</p>
                  )}
                  {/* Payment method badge on mobile */}
                  <div className="sm:hidden mt-1 flex items-center gap-2">
                    <Badge color={PAYMENT_COLORS[expense.payment_method] || "#64748b"} size="sm">
                      {expense.payment_method}
                    </Badge>
                    {expense.category && (
                      <Badge color={expense.category.color} size="sm">
                        {expense.category.name}
                      </Badge>
                    )}
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 ml-auto">
                      {formatPaise(expense.amount_paise, currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Date */}
                <span className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(expense.date)}
                </span>

                {/* Category */}
                <div className="hidden sm:block">
                  {expense.category && (
                    <Badge color={expense.category.color} size="sm">
                      {expense.category.name}
                    </Badge>
                  )}
                </div>

                {/* Amount */}
                <span className="hidden sm:block text-sm font-bold text-slate-800 dark:text-slate-100 text-right">
                  {formatPaise(expense.amount_paise, currencySymbol)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 justify-end sm:justify-start">
                  <button
                    onClick={() => onEditExpense(expense)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                    aria-label={`Edit ${expense.description}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(expense)}
                    disabled={deletingId === expense.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-40"
                    aria-label={`Delete ${expense.description}`}
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span>
              Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, data.total)} of{" "}
              <strong>{data.total}</strong> expenses
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
              Page {page} / {data.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page >= data.total_pages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Expenses from CSV"
        description="Upload a CSV file to preview, resolve duplicates, and import expenses"
        maxWidth="2xl"
      >
        <CsvImportPanel
          onImportComplete={() => {
            setIsImportModalOpen(false);
            fetchExpenses();
          }}
        />
      </Modal>
    </div>
  );
};
