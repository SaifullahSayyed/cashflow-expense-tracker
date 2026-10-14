import { apiFetch } from "./client";
import {
  Category,
  Expense,
  Income,
  Budget,
  RecurringRule,
  DashboardSummary,
  PaginatedResponse,
  CsvPreviewResponse,
  CsvImportRowItem,
  AppSettings,
} from "./types";

export const api = {
  // Categories
  getCategories: () => apiFetch<Category[]>("/categories"),
  createCategory: (data: { name: string; color: string; icon?: string | null }) =>
    apiFetch<Category>("/categories", { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (id: number, data: { name?: string; color?: string; icon?: string | null }) =>
    apiFetch<Category>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCategory: (id: number, reassignTo?: number) => {
    const query = reassignTo ? `?reassign_to=${reassignTo}` : "";
    return apiFetch<{ message: string }>(`/categories/${id}${query}`, { method: "DELETE" });
  },

  // Expenses
  getExpenses: (params: {
    page?: number;
    page_size?: number;
    start_date?: string;
    end_date?: string;
    category_id?: number[];
    payment_method?: string[];
    min_amount_paise?: number;
    max_amount_paise?: number;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  }) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", params.page.toString());
    if (params.page_size) q.set("page_size", params.page_size.toString());
    if (params.start_date) q.set("start_date", params.start_date);
    if (params.end_date) q.set("end_date", params.end_date);
    if (params.category_id) params.category_id.forEach((id) => q.append("category_id", id.toString()));
    if (params.payment_method) params.payment_method.forEach((pm) => q.append("payment_method", pm));
    if (params.min_amount_paise !== undefined && params.min_amount_paise !== null) {
      q.set("min_amount_paise", params.min_amount_paise.toString());
    }
    if (params.max_amount_paise !== undefined && params.max_amount_paise !== null) {
      q.set("max_amount_paise", params.max_amount_paise.toString());
    }
    if (params.search) q.set("search", params.search);
    if (params.sort_by) q.set("sort_by", params.sort_by);
    if (params.sort_order) q.set("sort_order", params.sort_order);

    return apiFetch<PaginatedResponse<Expense>>(`/expenses?${q.toString()}`);
  },
  getExpense: (id: number) => apiFetch<Expense>(`/expenses/${id}`),
  createExpense: (data: {
    category_id: number;
    amount_paise: number;
    date: string;
    description: string;
    payment_method: string;
    notes?: string | null;
  }) => apiFetch<Expense>("/expenses", { method: "POST", body: JSON.stringify(data) }),
  updateExpense: (
    id: number,
    data: {
      category_id?: number;
      amount_paise?: number;
      date?: string;
      description?: string;
      payment_method?: string;
      notes?: string | null;
    }
  ) => apiFetch<Expense>(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteExpense: (id: number) => apiFetch<{ message: string }>(`/expenses/${id}`, { method: "DELETE" }),

  // Income
  getIncome: (params: { page?: number; page_size?: number; start_date?: string; end_date?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", params.page.toString());
    if (params.page_size) q.set("page_size", params.page_size.toString());
    if (params.start_date) q.set("start_date", params.start_date);
    if (params.end_date) q.set("end_date", params.end_date);
    if (params.search) q.set("search", params.search);
    return apiFetch<PaginatedResponse<Income>>(`/income?${q.toString()}`);
  },
  createIncome: (data: {
    amount_paise: number;
    date: string;
    source: string;
    description: string;
    payment_method: string;
  }) => apiFetch<Income>("/income", { method: "POST", body: JSON.stringify(data) }),
  updateIncome: (
    id: number,
    data: {
      amount_paise?: number;
      date?: string;
      source?: string;
      description?: string;
      payment_method?: string;
    }
  ) => apiFetch<Income>(`/income/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteIncome: (id: number) => apiFetch<{ message: string }>(`/income/${id}`, { method: "DELETE" }),

  // Budgets
  getBudgets: (month: number, year: number) =>
    apiFetch<Budget[]>(`/budgets?month=${month}&year=${year}`),
  createBudget: (data: { category_id?: number | null; month: number; year: number; limit_amount_paise: number }) =>
    apiFetch<Budget>("/budgets", { method: "POST", body: JSON.stringify(data) }),
  updateBudget: (id: number, data: { limit_amount_paise: number }) =>
    apiFetch<Budget>(`/budgets/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteBudget: (id: number) => apiFetch<{ message: string }>(`/budgets/${id}`, { method: "DELETE" }),

  // Dashboard
  getDashboardSummary: (month?: number, year?: number) => {
    const q = new URLSearchParams();
    if (month) q.set("month", month.toString());
    if (year) q.set("year", year.toString());
    return apiFetch<DashboardSummary>(`/dashboard/summary?${q.toString()}`);
  },

  // Recurring Rules
  getRecurringRules: () => apiFetch<RecurringRule[]>("/recurring"),
  createRecurringRule: (data: {
    category_id: number;
    amount_paise: number;
    description: string;
    payment_method: string;
    frequency: string;
    start_date: string;
    end_date?: string | null;
  }) => apiFetch<RecurringRule>("/recurring", { method: "POST", body: JSON.stringify(data) }),
  updateRecurringRule: (id: number, data: Partial<RecurringRule>) =>
    apiFetch<RecurringRule>(`/recurring/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteRecurringRule: (id: number) =>
    apiFetch<{ message: string }>(`/recurring/${id}`, { method: "DELETE" }),
  processRecurringRules: (targetDate?: string) => {
    const q = targetDate ? `?target_date=${targetDate}` : "";
    return apiFetch<{ rules_checked: number; entries_generated: number; generated_expense_ids: number[] }>(
      `/recurring/process${q}`,
      { method: "POST" }
    );
  },

  // Export / Import
  getExportUrl: (params?: Record<string, any>) => {
    const q = new URLSearchParams(params || {});
    return `/api/v1/export/expenses.csv?${q.toString()}`;
  },
  previewCsvImport: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<CsvPreviewResponse>("/import/preview", {
      method: "POST",
      body: formData,
    });
  },
  confirmCsvImport: (rows: CsvImportRowItem[]) =>
    apiFetch<{ imported_count: number; skipped_count: number; message: string }>("/import/confirm", {
      method: "POST",
      body: JSON.stringify({ rows }),
    }),

  // Settings
  getSettings: () => apiFetch<{ settings: AppSettings }>("/settings"),
  updateSettings: (settings: AppSettings) =>
    apiFetch<{ settings: AppSettings }>("/settings", {
      method: "PUT",
      body: JSON.stringify({ settings }),
    }),
};
