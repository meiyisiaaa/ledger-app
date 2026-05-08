import type { BudgetSummary, CategoryDefinition, SortMode, Transaction, TypeFilter } from "./types";

export function findCategory<T extends CategoryDefinition>(source: T[], id: string) {
  return source.find((category) => category.id === id) ?? source[0];
}

export function calculateTotals(transactions: Transaction[]) {
  return transactions.reduce(
    (sum, item) => {
      if (item.type === "income") sum.income += item.amount;
      if (item.type === "expense") sum.expense += item.amount;
      return sum;
    },
    { income: 0, expense: 0 },
  );
}

export function calculateBudgetSummary(
  transactions: Transaction[],
  monthlyBudget: number,
  savingsTarget: number,
  date = new Date(),
): BudgetSummary {
  const totals = calculateTotals(transactions);
  const netBalance = totals.income - totals.expense;
  const budgetRemaining = monthlyBudget - totals.expense;
  const budgetRate = monthlyBudget > 0 ? Math.min(totals.expense / monthlyBudget, 1) : 0;
  const savingsRate = savingsTarget > 0 ? Math.min(Math.max(netBalance, 0) / savingsTarget, 1) : 0;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const daysLeftInMonth = Math.max(daysInMonth - date.getDate() + 1, 1);

  return {
    income: totals.income,
    expense: totals.expense,
    netBalance,
    budgetRemaining,
    budgetRate,
    budgetUsedPercent: budgetRate * 100,
    savingsRate,
    savingsPercent: savingsRate * 100,
    daysLeftInMonth,
    dailySpendable: budgetRemaining / daysLeftInMonth,
  };
}

export function getCategoryTotals<T extends CategoryDefinition>(
  transactions: Transaction[],
  categories: T[],
) {
  return categories
    .filter((category) => category.id !== "income")
    .map((category) => ({
      ...category,
      total: transactions
        .filter((item) => item.type === "expense" && item.category === category.id)
        .reduce((sum, item) => sum + item.amount, 0),
    }))
    .filter((category) => category.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function filterTransactions<T extends CategoryDefinition>(
  transactions: Transaction[],
  categories: T[],
  options: { query?: string; typeFilter?: TypeFilter; categoryFilter?: string },
) {
  const keyword = options.query?.trim().toLowerCase() ?? "";
  const typeFilter = options.typeFilter ?? "all";
  const categoryFilter = options.categoryFilter ?? "all";

  return transactions.filter((item) => {
    const category = findCategory(categories, item.category);
    const categoryLabel = category?.label ?? "";
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesKeyword =
      !keyword ||
      [item.title, item.note, item.account, categoryLabel].some((value) => value.toLowerCase().includes(keyword));
    return matchesType && matchesCategory && matchesKeyword;
  });
}

export function sortTransactions(transactions: Transaction[], sortMode: SortMode) {
  return [...transactions].sort((a, b) => {
    if (sortMode === "amountDesc") return b.amount - a.amount;
    if (sortMode === "amountAsc") return a.amount - b.amount;
    return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
  });
}
