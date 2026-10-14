import React, { useState, useEffect, useCallback } from "react";
import { RepeatIcon, Plus, Pencil, Trash2, Play, Pause } from "lucide-react";
import { RecurringRule, Category } from "../api/types";
import { api } from "../api/endpoints";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { formatPaise } from "../utils/currency";
import { formatDate, getTodayIso } from "../utils/date";
import { parseInputToPaise, paiseToInputValue } from "../utils/currency";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { Input } from "../components/common/Input";
import { Select } from "../components/common/Select";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { Skeleton } from "../components/common/SkeletonLoader";

export const RecurringPage: React.FC = () => {
  const { currencySymbol } = useSettings();
  const { success, error: showError } = useToast();

  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<RecurringRule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    category_id: "",
    frequency: "monthly",
    start_date: getTodayIso(),
    payment_method: "UPI",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rulesData, catData] = await Promise.all([
        api.getRecurringRules(),
        api.getCategories(),
      ]);
      setRules(rulesData);
      setCategories(catData);
    } catch (err: any) {
      showError("Failed to load recurring rules", err.detail || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingRule(null);
    setForm({ description: "", amount: "", category_id: categories[0]?.id?.toString() || "", frequency: "monthly", start_date: getTodayIso(), payment_method: "UPI" });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEdit = (rule: RecurringRule) => {
    setEditingRule(rule);
    setForm({
      description: rule.description,
      amount: paiseToInputValue(rule.amount_paise),
      category_id: String(rule.category_id),
      frequency: rule.frequency,
      start_date: rule.start_date,
      payment_method: rule.payment_method,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    const paise = parseInputToPaise(form.amount);
    if (!form.description.trim()) errs.description = "Description is required";
    if (!form.amount.trim()) errs.amount = "Amount is required";
    else if (paise <= 0) errs.amount = "Amount must be greater than 0";
    if (!form.category_id) errs.category_id = "Category is required";
    if (!form.start_date) errs.start_date = "Start date is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        description: form.description.trim(),
        amount_paise: parseInputToPaise(form.amount),
        category_id: parseInt(form.category_id),
        frequency: form.frequency as RecurringRule["frequency"],
        start_date: form.start_date,
        next_due_date: form.start_date,
        payment_method: form.payment_method,
      };
      if (editingRule) {
        await api.updateRecurringRule(editingRule.id, payload);
        success("Rule updated");
      } else {
        await api.createRecurringRule(payload);
        success("Recurring rule created");
      }
      setIsFormOpen(false);
      fetchData();
    } catch (err: any) {
      showError("Failed to save rule", err.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (rule: RecurringRule) => {
    try {
      await api.updateRecurringRule(rule.id, { is_active: !rule.is_active });
      success(rule.is_active ? "Rule paused" : "Rule activated");
      fetchData();
    } catch (err: any) {
      showError("Failed to update rule", err.detail || err.message);
    }
  };

  const handleDelete = async () => {
    if (!deletingRule) return;
    setIsDeleting(true);
    try {
      await api.deleteRecurringRule(deletingRule.id);
      success("Rule deleted");
      setDeletingRule(null);
      fetchData();
    } catch (err: any) {
      showError("Failed to delete rule", err.detail || err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const res = await api.processRecurringRules();
      success("Rules processed", `Generated ${res.entries_generated} expense${res.entries_generated !== 1 ? "s" : ""}`);
      fetchData();
    } catch (err: any) {
      showError("Failed to process rules", err.detail || err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const FREQUENCIES = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  const PAYMENT_METHODS = ["UPI", "card", "cash", "other", "bank"];

  const FREQ_COLORS: Record<string, string> = {
    daily: "#f97316",
    weekly: "#06b6d4",
    monthly: "#6366f1",
    yearly: "#8b5cf6",
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <RepeatIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Recurring Rules
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Auto-generate expenses for rent, subscriptions, and bills
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleProcess} disabled={isProcessing}
            icon={<Play className={`w-3.5 h-3.5 ${isProcessing ? "animate-pulse" : ""}`} />}>
            Process Due Rules
          </Button>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            New Rule
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : rules.length === 0 ? (
        <EmptyState
          title="No recurring rules"
          description="Set up recurring items like rent or subscriptions to auto-generate expenses"
          actionText="Create Rule"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm transition-all ${
                rule.is_active
                  ? "border-slate-200 dark:border-slate-800"
                  : "border-slate-100 dark:border-slate-900 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{rule.description}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge color={FREQ_COLORS[rule.frequency] || "#64748b"} size="sm">
                      {rule.frequency}
                    </Badge>
                    {rule.category && (
                      <Badge color={rule.category.color} size="sm">{rule.category.name}</Badge>
                    )}
                    {!rule.is_active && (
                      <Badge color="#94a3b8" size="sm">paused</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
                  <button onClick={() => handleToggleActive(rule)} className={`p-1.5 rounded-lg transition-colors ${rule.is_active ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40" : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"}`}>
                    {rule.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => openEdit(rule)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeletingRule(rule)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-base">
                  {formatPaise(rule.amount_paise, currencySymbol)}
                </span>
                <div className="text-right">
                  <p>Next: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatDate(rule.next_due_date)}</span></p>
                  {rule.last_run_date && <p className="text-xs text-slate-400">Last: {formatDate(rule.last_run_date)}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingRule ? "Edit Rule" : "New Recurring Rule"}
        description="Set up an auto-generating expense"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Description"
            placeholder="e.g. House Rent, Netflix subscription"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            error={formErrors.description}
            required
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              prefixElement={<span className="text-sm font-semibold">{currencySymbol}</span>}
              error={formErrors.amount}
              required
            />
            <Select
              label="Frequency"
              value={form.frequency}
              onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
              options={FREQUENCIES}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              error={formErrors.category_id}
              required
            />
            <Input
              label="Start Date"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              error={formErrors.start_date}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Method</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, payment_method: m }))}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all ${
                    form.payment_method === m
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >{m}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>{editingRule ? "Update" : "Create Rule"}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deletingRule} onClose={() => setDeletingRule(null)} title="Delete Rule" description="This cannot be undone">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Delete the recurring rule <strong>"{deletingRule?.description}"</strong>? Past generated expenses will remain.
          </p>
          <div className="flex justify-end gap-2.5">
            <Button variant="ghost" onClick={() => setDeletingRule(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete Rule</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
