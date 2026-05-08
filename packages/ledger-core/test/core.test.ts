declare const require: (id: string) => {
  equal: (actual: unknown, expected: unknown) => void;
  deepEqual: (actual: unknown, expected: unknown) => void;
};

const assert = require("node:assert/strict");
import {
  calculateBudgetSummary,
  createLedgerBackup,
  currentLedgerSchemaVersion,
  defaultCategoryDefinitions,
  defaultMonthlyBudget,
  defaultStoredAccounts,
  filterTransactions,
  getCategoryTotals,
  mergeAccountsWithLabels,
  parseLedgerBackup,
  sortTransactions,
} from "../src/index";
import type { Transaction } from "../src/index";

const transactions: Transaction[] = [
  {
    id: "t-1",
    type: "expense",
    title: "午餐",
    category: "food",
    amount: 38,
    account: "微信钱包",
    date: "2026-05-07",
    note: "工作日简餐",
  },
  {
    id: "t-2",
    type: "expense",
    title: "通勤",
    category: "traffic",
    amount: 7,
    account: "支付宝",
    date: "2026-05-08",
    note: "地铁",
  },
  {
    id: "t-3",
    type: "income",
    title: "工资",
    category: "income",
    amount: 5000,
    account: "储蓄卡",
    date: "2026-05-06",
    note: "五月",
  },
];

const budget = calculateBudgetSummary(transactions, 5200, 3000, new Date("2026-05-08T12:00:00"));
assert.equal(budget.income, 5000);
assert.equal(budget.expense, 45);
assert.equal(budget.netBalance, 4955);
assert.equal(budget.daysLeftInMonth, 24);
assert.equal(Math.round(budget.dailySpendable), 215);

const filtered = filterTransactions(transactions, defaultCategoryDefinitions, {
  query: "地铁",
  typeFilter: "expense",
  categoryFilter: "traffic",
});
assert.deepEqual(filtered.map((item) => item.id), ["t-2"]);

const sorted = sortTransactions(transactions, "amountDesc");
assert.deepEqual(sorted.map((item) => item.id), ["t-3", "t-1", "t-2"]);

const categoryTotals = getCategoryTotals(transactions, defaultCategoryDefinitions);
assert.deepEqual(categoryTotals.map((item) => [item.id, item.total]), [
  ["food", 38],
  ["traffic", 7],
]);

const backup = createLedgerBackup({
  transactions,
  appVersion: "1.0.0",
  settings: {
    monthlyBudget: 5200,
    savingsTarget: 3000,
    themeId: "classic",
    accounts: [{ id: "account-custom", label: "家庭卡", hidden: false }],
    customTemplates: [{ id: "custom-1", type: "expense", title: "咖啡", amount: "32", category: "coffee", account: "微信钱包", note: "" }],
    customCategories: [{ id: "pet", label: "宠物", color: "#227c70", soft: "#d9f2ea" }],
  },
});
const parsed = parseLedgerBackup(JSON.stringify(backup));
assert.equal(backup.version, currentLedgerSchemaVersion);
assert.equal(parsed.appVersion, "1.0.0");
assert.equal(parsed.transactions.length, 3);
assert.equal(parsed.settings.schemaVersion, currentLedgerSchemaVersion);
assert.equal(parsed.settings.monthlyBudget, 5200);
assert.equal(parsed.settings.accounts.some((account) => account.label === "家庭卡"), true);
assert.equal(parsed.settings.accounts.some((account) => account.label === "微信钱包"), true);
assert.equal(parsed.settings.customTemplates[0].title, "咖啡");
assert.equal(parsed.settings.customCategories[0].label, "宠物");
assert.equal(parsed.settings.themeId, "classic");

const legacyBackup = parseLedgerBackup(
  JSON.stringify({
    version: 1,
    transactions: [
      {
        type: "expense",
        title: "旧账单",
        category: "food",
        amount: "26",
        account: "老银行卡",
        date: "2026-05-01",
      },
    ],
    settings: {
      monthlyBudget: "not-a-number",
      savingsTarget: "1800",
      customTemplates: [{ type: "expense", title: "旧模板", amount: 12, category: "food" }],
      customCategories: [{ label: "宠物" }],
    },
  }),
);
assert.equal(legacyBackup.settings.schemaVersion, currentLedgerSchemaVersion);
assert.equal(legacyBackup.settings.monthlyBudget, defaultMonthlyBudget);
assert.equal(legacyBackup.settings.savingsTarget, 1800);
assert.deepEqual(defaultStoredAccounts.map((account) => account.label), ["微信钱包", "支付宝", "储蓄卡", "现金袋"]);
assert.equal(legacyBackup.settings.accounts.some((account) => account.label === "老银行卡"), true);
assert.equal(legacyBackup.settings.customTemplates[0].title, "旧模板");
assert.equal(legacyBackup.settings.customCategories[0].label, "宠物");
assert.equal(legacyBackup.transactions[0].amount, 26);

const mergedAccounts = mergeAccountsWithLabels(
  [{ id: "hidden-cash", label: "现金袋", hidden: true }],
  ["现金袋", "备用卡", "备用卡", ""],
);
assert.deepEqual(mergedAccounts.map((account) => [account.label, account.hidden === true]), [
  ["现金袋", true],
  ["备用卡", false],
]);

console.log("ledger-core tests passed");
