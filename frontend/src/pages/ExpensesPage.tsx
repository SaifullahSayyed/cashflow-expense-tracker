import React, { useState, useEffect, useCallback } from "react";
import { Receipt } from "lucide-react";
import { Category, Expense } from "../api/types";
import { api } from "../api/endpoints";
import { ExpenseTable } from "../components/expenses/ExpenseTable";
import { ExpenseFormModal } from "../components/expenses/ExpenseFormModal";
import { useToast } from "../context/ToastContext";

export const ExpensesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { error: showError } = useToast();

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err: any) {
      showError("Failed to load categories", err.detail || err.message);
    }
  }, [showError]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddExpense = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setRefreshTrigger((t) => t + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Expenses
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View, search, filter, and track all your logged expenses
          </p>
        </div>
      </div>

      <ExpenseTable
        categories={categories}
        onAddExpense={handleAddExpense}
        onEditExpense={handleEditExpense}
        refreshTrigger={refreshTrigger}
      />

      <ExpenseFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingExpense(null); }}
        categories={categories}
        expenseToEdit={editingExpense}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};
