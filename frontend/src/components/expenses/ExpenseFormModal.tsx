import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { Button } from "../common/Button";
import { Category, Expense } from "../../api/types";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../api/endpoints";
import { getTodayIso } from "../../utils/date";
import { parseInputToPaise, paiseToInputValue } from "../../utils/currency";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  expenseToEdit?: Expense | null;
  onSuccess: (savedExpense: Expense) => void;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  categories,
  expenseToEdit,
  onSuccess,
}) => {
  const { currencySymbol } = useSettings();
  const { success, error: showError } = useToast();

  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [date, setDate] = useState(getTodayIso());
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (expenseToEdit) {
      setAmountStr(paiseToInputValue(expenseToEdit.amount_paise));
      setDescription(expenseToEdit.description);
      setCategoryId(expenseToEdit.category_id);
      setDate(expenseToEdit.date);
      setPaymentMethod(expenseToEdit.payment_method);
      setNotes(expenseToEdit.notes || "");
    } else {
      setAmountStr("");
      setDescription("");
      setCategoryId(categories.length > 0 ? categories[0].id : "");
      setDate(getTodayIso());
      setPaymentMethod("UPI");
      setNotes("");
    }
    setErrors({});
  }, [expenseToEdit, isOpen, categories]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const paise = parseInputToPaise(amountStr);

    if (!amountStr.trim()) {
      newErrors.amount = "Amount is required";
    } else if (paise <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!categoryId) {
      newErrors.category = "Please select a category";
    }

    if (!date) {
      newErrors.date = "Date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const amountPaise = parseInputToPaise(amountStr);
      const payload = {
        category_id: Number(categoryId),
        amount_paise: amountPaise,
        date,
        description: description.trim(),
        payment_method: paymentMethod,
        notes: notes.trim() || null,
      };

      let result: Expense;
      if (expenseToEdit) {
        result = await api.updateExpense(expenseToEdit.id, payload);
        success("Expense updated", `Updated "${result.description}" successfully`);
      } else {
        result = await api.createExpense(payload);
        success("Expense added", `Recorded "${result.description}" successfully`);
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      showError("Failed to save expense", err.detail || err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethods = ["UPI", "card", "cash", "other"];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseToEdit ? "Edit Expense" : "Add New Expense"}
      description="Record a transaction with category and payment details"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Amount Input */}
        <Input
          label="Amount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          prefixElement={<span className="font-semibold text-sm">{currencySymbol}</span>}
          error={errors.amount}
          required
          autoFocus
        />

        {/* Description */}
        <Input
          label="Description"
          placeholder="e.g. Grocery shopping, Metro card recharge"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
          required
        />

        {/* Category & Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            options={categories.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            error={errors.category}
            required
          />

          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
            required
          />
        </div>

        {/* Payment Method Pills */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Payment Method
          </label>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((method) => {
              const isSelected = paymentMethod === method;
              return (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-150 border ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {method}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes (Optional) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Notes (Optional)
          </label>
          <textarea
            rows={2}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-colors"
            placeholder="Add any extra details or tags..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {expenseToEdit ? "Update Expense" : "Save Expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
