import {
  currentLedgerSchemaVersion,
  defaultAccounts,
  defaultMonthlyBudget,
  defaultSavingsTarget,
  defaultStoredAccounts,
} from "./defaults";
import type { LedgerSettings, QuickTemplate, StoredAccount, StoredCustomCategory, Transaction } from "./types";
import { makeId, readAmountSetting } from "./utils";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

export function readCustomTemplates(value: unknown): QuickTemplate[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<QuickTemplate> => Boolean(item && typeof item === "object"))
    .map((item): QuickTemplate => ({
      id: typeof item.id === "string" ? item.id : makeId("template"),
      custom: true,
      type: item.type === "income" ? "income" : "expense",
      title: typeof item.title === "string" ? item.title : "",
      amount: typeof item.amount === "string" ? item.amount : "",
      category: typeof item.category === "string" ? item.category : "food",
      account: typeof item.account === "string" ? item.account : defaultAccounts[0],
      note: typeof item.note === "string" ? item.note : "",
    }))
    .filter((item) => item.title.trim());
}

export function readCustomCategories(value: unknown): StoredCustomCategory[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<StoredCustomCategory> => Boolean(item && typeof item === "object"))
    .map((item): StoredCustomCategory => ({
      id: typeof item.id === "string" ? item.id : makeId("category"),
      label: typeof item.label === "string" ? item.label.trim() : "",
      color: typeof item.color === "string" ? item.color : "#227c70",
      soft: typeof item.soft === "string" ? item.soft : "#d9f2ea",
    }))
    .filter((item) => item.label);
}

function normalizeAccountLabel(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cloneDefaultAccounts() {
  return defaultStoredAccounts.map((account) => ({ ...account }));
}

export function readAccounts(value: unknown): StoredAccount[] {
  if (!Array.isArray(value)) return cloneDefaultAccounts();

  const seen = new Set<string>();
  const accounts = value
    .map((item): StoredAccount | null => {
      if (typeof item === "string") {
        const label = normalizeAccountLabel(item);
        return label ? { id: makeId("account"), label, hidden: false } : null;
      }
      if (!isRecord(item)) return null;
      const label = normalizeAccountLabel(item.label);
      if (!label) return null;
      return {
        id: typeof item.id === "string" && item.id.trim() ? item.id : makeId("account"),
        label,
        hidden: item.hidden === true,
      };
    })
    .filter((item): item is StoredAccount => {
      if (!item || seen.has(item.label)) return false;
      seen.add(item.label);
      return true;
    });

  return accounts.length > 0 ? accounts : cloneDefaultAccounts();
}

export function mergeAccountsWithLabels(accounts: StoredAccount[], labels: unknown[]): StoredAccount[] {
  const seen = new Set<string>();
  const merged = accounts.filter((account) => {
    const label = account.label.trim();
    if (!label || seen.has(label)) return false;
    seen.add(label);
    return true;
  });

  labels.forEach((value) => {
    const label = normalizeAccountLabel(value);
    if (!label || seen.has(label)) return;
    seen.add(label);
    merged.push({ id: makeId("account"), label, hidden: false });
  });

  return merged.length > 0 ? merged : cloneDefaultAccounts();
}

export function readTransactions(value: unknown): Transaction[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<Transaction> => Boolean(item && typeof item === "object"))
    .map((item): Transaction => ({
      id: typeof item.id === "string" ? item.id : makeId("transaction"),
      type: item.type === "income" ? "income" : "expense",
      title: typeof item.title === "string" ? item.title : "",
      category: typeof item.category === "string" ? item.category : "food",
      amount: readAmountSetting(item.amount, 0),
      account: typeof item.account === "string" ? item.account : defaultAccounts[0],
      date: typeof item.date === "string" ? item.date : new Date().toISOString().slice(0, 10),
      note: typeof item.note === "string" ? item.note : "",
    }))
    .filter((item) => item.title.trim() && item.amount > 0);
}

export function normalizeLedgerSettings(value: unknown): LedgerSettings & Record<string, unknown> {
  const raw = isRecord(value) ? value : {};

  return {
    ...raw,
    schemaVersion: currentLedgerSchemaVersion,
    monthlyBudget: readAmountSetting(raw.monthlyBudget, defaultMonthlyBudget),
    savingsTarget: readAmountSetting(raw.savingsTarget, defaultSavingsTarget),
    accounts: readAccounts(raw.accounts),
    customTemplates: readCustomTemplates(raw.customTemplates),
    customCategories: readCustomCategories(raw.customCategories),
  };
}

export function createLedgerSettings(settings: Partial<LedgerSettings> & Record<string, unknown>) {
  return normalizeLedgerSettings({
    ...settings,
    schemaVersion: currentLedgerSchemaVersion,
  });
}
