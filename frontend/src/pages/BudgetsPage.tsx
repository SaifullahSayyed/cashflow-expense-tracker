import React, { useState, useEffect, useCallback } from "react";
import { PiggyBank, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Budget, Category } from "../api/types";
import { api } from "../api/endpoints";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { formatPaise } from "../utils/currency";
import { getCurrentMonthAndYear } from "../utils/date";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { Input } from "../components/common/Input";
import { Select } from "../components/common/Select";
import { ProgressBar } from "../components/common/ProgressBar";
import { EmptyState } from "../components/common/EmptyState";
import { Skeleton } from "../components/common/SkeletonLoader";
import { parseInputToPaise, paiseToInputValue } from "../utils/currency";

interface BudgetFormData {
  category_id: string;
  limit_amount_paise: string;
  month: number;
  year: number;
}

export const BudgetsPage: React.FC = () => {
  const { currencySymbol } = useSettings();
  const { success, error: showError } = useToast();

  const { month: curMonth, year: curYear } = getCurrentMonthAndYear();
  const [selectedMonth, setSelectedMonth] = useState(curMonth);
  const [selectedYear, setSelectedYear] = useState(curYear);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<BudgetFormData>({
    category_id: "",
    limit_amount_paise: "",
    month: curMonth,
    year: curYear,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [budgetData, categoryData] = await Promise.all([
        api.getBudgets({ month: selectedMonth, year: selectedYear }),
        api.getCategories(),
      ]);
      setBudgets(budgetData);
      setCategories(categoryData);
    } catch (err: any) {
      showError("Failed to load budgets", err.detail || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear, showError]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateForm = () => {
    setEditingBudget(null);
    setFormData({ category_id: "", limit_amount_paise: "", month: selectedMonth, year: selectedYear });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditForm = (b: Budget) => {
    setEditingBudget(b);
    setFormData({
      category_id: b.category_id !== null && b.category_id !== undefined ? String(b.category_id) : "",
      limit_amount_paise: paiseToInputValue(b.limit_amount_paise),
      month: b.month,
      year: b.year,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    const paise = parseInputToPaise(formData.limit_amount_paise);
    if (!formData.limit_amount_paise.trim()) errs.limit = "Amount is required";
    else if (paise <= 0) errs.limit = "Amount must be greater than 0";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        limit_amount_paise: parseInputToPaise(formData.limit_amount_paise),
        month: formData.month,
        year: formData.year,
      };
      if (editingBudget) {
        await api.updateBudget(editingBudget.id, { limit_amount_paise: payload.limit_amount_paise });
        success("Budget updated");
      } else {
        await api.createBudget(payload);
        success("Budget created");
      }
      setIsFormOpen(false);
      fetchData();
    } catch (err: any) {
      showError("Failed to save budget", err.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBudget) return;
    setIsDeleting(true);
    try {
      await api.deleteBudget(deletingBudget.id);
      success("Budget deleted");
      setDeletingBudget(null);
      fetchData();
    } catch (err: any) {
      showError("Failed to delete budget", err.detail || err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const overallBudget = budgets.find((b) => b.category_id === null || b.category_id === undefined);
  const categoryBudgets = budgets.filter((b) => b.category_id !== null && b.category_id !== undefined);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleString("en-IN", { month: "long" }),
  }));

  const usedCategoryIds = new Set(budgets.map((b) => b.category_id).filter(Boolean));
  const availableCategories = categories.filter((c) => !usedCategoryIds.has(c.id) || editingBudget?.category_id === c.id);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Budgets
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Set monthly spending limits per category and track progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            min={2020}
            max={2100}
            className="text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 w-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreateForm}>
            Add Budget
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          title="No budgets set"
          description={`No budgets configured for ${months[selectedMonth - 1]?.label} ${selectedYear}. Set limits to track your spending.`}
          actionText="Add Budget"
          onAction={openCreateForm}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Overall Budget */}
          {overallBudget && (
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Overall Budget</p>
                  <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                    {formatPaise(overallBudget.spent_paise, currencySymbol)}
                    <span className="text-slate-400 font-normal text-sm"> / {formatPaise(overallBudget.limit_amount_paise, currencySymbol)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {overallBudget.percentage_used >= 80 && (
                    <AlertTriangle className={`w-4 h-4 ${overallBudget.percentage_used >= 100 ? "text-rose-500" : "text-amber-500"}`} />
                  )}
                  <span className={`text-sm font-bold ${
                    overallBudget.percentage_used >= 100 ? "text-rose-600" : overallBudget.percentage_used >= 80 ? "text-amber-600" : "text-emerald-600"
                  }`}>
                    {overallBudget.percentage_used.toFixed(1)}%
                  </span>
                  <button onClick={() => openEditForm(overallBudget)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 ml-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeletingBudget(overallBudget)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <ProgressBar percentage={overallBudget.percentage_used} />
              <p className="text-xs text-slate-400 mt-2">
                {formatPaise(overallBudget.remaining_paise, currencySymbol)} remaining
              </p>
            </div>
          )}

          {/* Category Budgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryBudgets.map((budget) => (
              <div key={budget.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {budget.category && (
                      <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: budget.category.color + "25" }}>
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.category.color }} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {budget.category?.name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatPaise(budget.spent_paise, currencySymbol)} / {formatPaise(budget.limit_amount_paise, currencySymbol)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                    {budget.percentage_used >= 80 && (
                      <AlertTriangle className={`w-3.5 h-3.5 ${budget.percentage_used >= 100 ? "text-rose-500" : "text-amber-500"}`} />
                    )}
                    <button onClick={() => openEditForm(budget)} className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeletingBudget(budget)} className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <ProgressBar percentage={budget.percentage_used} />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-slate-400">
                    {budget.remaining_paise >= 0
                      ? `${formatPaise(budget.remaining_paise, currencySymbol)} left`
                      : `${formatPaise(-budget.remaining_paise, currencySymbol)} over`}
                  </p>
                  <span className={`text-xs font-bold ${
                    budget.percentage_used >= 100 ? "text-rose-600" : budget.percentage_used >= 80 ? "text-amber-600" : "text-emerald-600"
                  }`}>
                    {budget.percentage_used.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingBudget ? "Edit Budget" : "Set Budget"}
        description="Set a monthly spending limit"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!editingBudget && (
            <Select
              label="Category (leave blank for overall budget)"
              value={formData.category_id}
              onChange={(e) => setFormData((f) => ({ ...f, category_id: e.target.value }))}
              options={[
                { value: "", label: "— Overall Budget —" },
                ...availableCategories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          )}

          <Input
            label="Monthly Limit"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={formData.limit_amount_paise}
            onChange={(e) => setFormData((f) => ({ ...f, limit_amount_paise: e.target.value }))}
            prefixElement={<span className="font-semibold text-sm">{currencySymbol}</span>}
            error={formErrors.limit}
            required
          />

          {!editingBudget && (
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Month"
                value={formData.month}
                onChange={(e) => setFormData((f) => ({ ...f, month: parseInt(e.target.value) }))}
                options={months.map((m) => ({ value: m.value, label: m.label }))}
              />
              <Input
                label="Year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData((f) => ({ ...f, year: parseInt(e.target.value) }))}
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>{editingBudget ? "Update" : "Set Budget"}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deletingBudget}
        onClose={() => setDeletingBudget(null)}
        title="Delete Budget"
        description="This will remove the spending limit"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Remove the {deletingBudget?.category?.name ?? "overall"} budget of{" "}
            <strong>{deletingBudget ? formatPaise(deletingBudget.limit_amount_paise, currencySymbol) : ""}</strong>?
          </p>
          <div className="flex justify-end gap-2.5">
            <Button variant="ghost" onClick={() => setDeletingBudget(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
