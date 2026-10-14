export type PaymentMethod = "UPI" | "card" | "cash" | "bank" | "other";

export interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string | null;
  is_default: boolean;
  expense_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  category_id: number;
  amount_paise: number;
  date: string;
  description: string;
  payment_method: string;
  notes?: string | null;
  recurring_rule_id?: number | null;
  category?: Category;
  created_at: string;
  updated_at: string;
}

export interface Income {
  id: number;
  amount_paise: number;
  date: string;
  source: string;
  description: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: number;
  category_id?: number | null;
  month: number;
  year: number;
  limit_amount_paise: number;
  spent_paise: number;
  remaining_paise: number;
  percentage_used: number;
  category?: Category | null;
  created_at: string;
  updated_at: string;
}

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringRule {
  id: number;
  category_id: number;
  amount_paise: number;
  description: string;
  payment_method: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string | null;
  next_due_date: string;
  last_run_date?: string | null;
  is_active: boolean;
  category?: Category;
  created_at: string;
  updated_at: string;
}

export interface DashboardCategoryItem {
  category_id: number;
  category_name: string;
  category_color: string;
  total_paise: number;
  percentage: number;
}

export interface DashboardTrendItem {
  date: string;
  total_paise: number;
}

export interface DashboardTransactionItem {
  id: number;
  type: "expense" | "income";
  date: string;
  description: string;
  amount_paise: number;
  category_name?: string | null;
  category_color?: string | null;
  payment_method: string;
}

export interface DashboardSummary {
  month: number;
  year: number;
  total_expenses_paise: number;
  total_income_paise: number;
  net_balance_paise: number;
  top_category?: DashboardCategoryItem | null;
  category_breakdown: DashboardCategoryItem[];
  spending_trend: DashboardTrendItem[];
  recent_transactions: DashboardTransactionItem[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CsvPreviewRow {
  row_index: number;
  date: string;
  amount_paise: number;
  description: string;
  category_name?: string | null;
  category_id?: number | null;
  payment_method: string;
  notes?: string | null;
  is_duplicate: boolean;
  duplicate_reason?: string | null;
}

export interface CsvPreviewResponse {
  total_rows: number;
  probable_duplicates: number;
  valid_rows: number;
  rows: CsvPreviewRow[];
  available_categories: { id: number; name: string; color: string }[];
}

export interface CsvImportRowItem {
  date: string;
  amount_paise: number;
  description: string;
  category_id: number;
  payment_method: string;
  notes?: string | null;
  import_confirmed: boolean;
}

export interface AppSettings {
  [key: string]: string;
}
