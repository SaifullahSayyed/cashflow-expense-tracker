import React, { useState, useEffect, useCallback } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ToastProvider } from "./context/ToastContext";
import { AppLayout } from "./components/layout/AppLayout";
import { NavTab } from "./components/layout/Sidebar";
import { ExpenseFormModal } from "./components/expenses/ExpenseFormModal";
import { Category, Expense } from "./api/types";
import { api } from "./api/endpoints";

import { DashboardPage } from "./pages/DashboardPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { IncomePage } from "./pages/IncomePage";
import { BudgetsPage } from "./pages/BudgetsPage";
import { RecurringPage } from "./pages/RecurringPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { SettingsPage } from "./pages/SettingsPage";

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>("dashboard");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch {
      // Handled in individual views
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Global keyboard shortcut: Ctrl/Cmd + K or Alt + A opens quick add
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleExpenseCreated = (_expense: Expense) => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <AppLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      onQuickAdd={() => setIsQuickAddOpen(true)}
    >
      {currentTab === "dashboard" && <DashboardPage key={refreshKey} />}
      {currentTab === "expenses" && <ExpensesPage key={refreshKey} />}
      {currentTab === "income" && <IncomePage key={refreshKey} />}
      {currentTab === "budgets" && <BudgetsPage key={refreshKey} />}
      {currentTab === "recurring" && <RecurringPage key={refreshKey} />}
      {currentTab === "categories" && <CategoriesPage />}
      {currentTab === "settings" && <SettingsPage />}

      <ExpenseFormModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        categories={categories}
        onSuccess={handleExpenseCreated}
      />
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
};

export default App;
