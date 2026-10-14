import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { Button } from "../common/Button";
import { Income } from "../../api/types";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../api/endpoints";
import { getTodayIso } from "../../utils/date";
import { parseInputToPaise, paiseToInputValue } from "../../utils/currency";

interface IncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomeToEdit?: Income | null;
  onSuccess: (saved: Income) => void;
}

export const IncomeFormModal: React.FC<IncomeFormModalProps> = ({
  isOpen,
  onClose,
  incomeToEdit,
  onSuccess,
}) => {
  const { currencySymbol } = useSettings();
  const { success, error: showError } = useToast();

  const [amountStr, setAmountStr] = useState("");
  const [date, setDate] = useState(getTodayIso());
  const [source, setSource] = useState("Salary");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const SOURCES = ["Salary", "Freelance", "Business", "Investment", "Gift", "Rental", "Other"];
  const PAYMENT_METHODS = ["bank", "UPI", "cash", "other"];

  useEffect(() => {
    if (incomeToEdit) {
      setAmountStr(paiseToInputValue(incomeToEdit.amount_paise));
      setDate(incomeToEdit.date);
      setSource(incomeToEdit.source);
      setDescription(incomeToEdit.description);
      setPaymentMethod(incomeToEdit.payment_method);
    } else {
      setAmountStr("");
      setDate(getTodayIso());
      setSource("Salary");
      setDescription("");
      setPaymentMethod("bank");
    }
    setErrors({});
  }, [incomeToEdit, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const paise = parseInputToPaise(amountStr);
    if (!amountStr.trim()) newErrors.amount = "Amount is required";
    else if (paise <= 0) newErrors.amount = "Amount must be greater than 0";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!date) newErrors.date = "Date is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const paise = parseInputToPaise(amountStr);
      const payload = {
        amount_paise: paise,
        date,
        source: source.trim(),
        description: description.trim(),
        payment_method: paymentMethod,
      };
      let result: Income;
      if (incomeToEdit) {
        result = await api.updateIncome(incomeToEdit.id, payload);
        success("Income updated", `Updated "${result.description}"`);
      } else {
        result = await api.createIncome(payload);
        success("Income recorded", `Added ${currencySymbol}${(paise / 100).toFixed(2)} from ${source}`);
      }
      onSuccess(result);
      onClose();
    } catch (err: any) {
      showError("Failed to save income", err.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={incomeToEdit ? "Edit Income Entry" : "Record Income"}
      description="Log a salary, freelance, or other income inflow"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            options={SOURCES.map((s) => ({ value: s, label: s }))}
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

        <Input
          label="Description"
          placeholder="e.g. October Salary, Client project payment"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Method</label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border ${
                  paymentMethod === method
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
            {incomeToEdit ? "Update Income" : "Record Income"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
