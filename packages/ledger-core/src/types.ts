export type EntryType = "expense" | "income";
export type TypeFilter = "all" | EntryType;
export type SortMode = "newest" | "amountDesc" | "amountAsc";

export type CategoryDefinition = {
  id: string;
  label: string;
  color: string;
  soft: string;
};

export type Transaction = {
  id: string;
  type: EntryType;
  title: string;
  category: string;
  amount: number;
  account: string;
  date: string;
  note: string;
};

export type LedgerDraft = {
  type: EntryType;
  title: string;
  category: string;
  amount: string;
  account: string;
  note: string;
};

export type QuickTemplate = LedgerDraft & {
  id: string;
  custom?: boolean;
};

export type StoredCustomCategory = CategoryDefinition & {
  id: string;
};

export type StoredAccount = {
  id: string;
  label: string;
  hidden?: boolean;
};

export type LedgerSettings = {
  schemaVersion: number;
  monthlyBudget: number;
  savingsTarget: number;
  accounts: StoredAccount[];
  customTemplates: QuickTemplate[];
  customCategories: StoredCustomCategory[];
};

export type LedgerBackup = {
  version: number;
  exportedAt: string;
  appVersion?: string;
  transactions: Transaction[];
  settings: Partial<LedgerSettings> & Record<string, unknown>;
};

export type BudgetSummary = {
  income: number;
  expense: number;
  netBalance: number;
  budgetRemaining: number;
  budgetRate: number;
  budgetUsedPercent: number;
  savingsRate: number;
  savingsPercent: number;
  daysLeftInMonth: number;
  dailySpendable: number;
};
