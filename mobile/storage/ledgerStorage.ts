import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createLedgerSettings,
  mergeAccountsWithLabels,
  normalizeLedgerSettings,
  readTransactions,
} from "../../packages/ledger-core/src";
import type { LedgerSettings, QuickTemplate, StoredAccount, StoredCustomCategory, Transaction } from "../../packages/ledger-core/src";
import { isThemeId, type ThemeId } from "../theme/presets";
import type { AuthDraft, UserProfile } from "../types";

const STORAGE_KEY = "ledger-journal-mobile:v2";
const SETTINGS_STORAGE_KEY = "ledger-journal-mobile:settings:v1";
const THEME_STORAGE_KEY = "ledger-journal-mobile:theme";
const USERS_STORAGE_KEY = "ledger-journal-mobile:users";
const SESSION_STORAGE_KEY = "ledger-journal-mobile:session";
const LEGACY_STORAGE_KEYS = ["ledger-journal-mobile:v1"];

type StoredUser = UserProfile & {
  password: string;
};

export type LedgerStorageSnapshot = {
  transactions: Transaction[];
  settings: LedgerSettings & Record<string, unknown>;
  themeId: ThemeId | null;
  currentUser: UserProfile | null;
};

export type LedgerSettingsInput = {
  monthlyBudget: number;
  savingsTarget: number;
  accounts: StoredAccount[];
  customTemplates: QuickTemplate[];
  customCategories: StoredCustomCategory[];
};

export type LocalAuthResult =
  | { ok: true; profile: UserProfile }
  | { ok: false; reason: "invalid" | "exists" | "not-found" };

function normalizeAccount(value: string) {
  return value.trim().toLowerCase();
}

function readUsersValue(value: string | null): StoredUser[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function parseStoredJson(value: string | null) {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function toProfile(user: StoredUser): UserProfile {
  const { password: _password, ...profile } = user;
  return profile;
}

export async function loadLedgerSnapshot(): Promise<LedgerStorageSnapshot> {
  await AsyncStorage.multiRemove(LEGACY_STORAGE_KEYS);
  const [savedThemeId, rawSettings, rawTransactions, rawUsers, savedSession] = await Promise.all([
    AsyncStorage.getItem(THEME_STORAGE_KEY),
    AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
    AsyncStorage.getItem(STORAGE_KEY),
    AsyncStorage.getItem(USERS_STORAGE_KEY),
    AsyncStorage.getItem(SESSION_STORAGE_KEY),
  ]);

  const users = readUsersValue(rawUsers);
  const sessionUser = users.find((user) => user.account === savedSession);
  const settings = parseStoredJson(rawSettings);
  const transactions = parseStoredJson(rawTransactions);
  const normalizedSettings = normalizeLedgerSettings(settings ?? {});
  const normalizedTransactions = readTransactions(transactions);
  normalizedSettings.accounts = mergeAccountsWithLabels(normalizedSettings.accounts, [
    ...normalizedTransactions.map((item) => item.account),
    ...normalizedSettings.customTemplates.map((item) => item.account),
  ]);

  return {
    themeId: isThemeId(savedThemeId) ? savedThemeId : null,
    settings: normalizedSettings,
    transactions: normalizedTransactions,
    currentUser: sessionUser ? toProfile(sessionUser) : null,
  };
}

export function saveTransactions(transactions: Transaction[]) {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

export function saveTheme(themeId: ThemeId) {
  return AsyncStorage.setItem(THEME_STORAGE_KEY, themeId);
}

export function saveLedgerSettings(settings: LedgerSettingsInput) {
  return AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(createLedgerSettings(settings)));
}

export function clearLedgerData() {
  return AsyncStorage.multiRemove([STORAGE_KEY, ...LEGACY_STORAGE_KEYS]);
}

async function readUsers() {
  return readUsersValue(await AsyncStorage.getItem(USERS_STORAGE_KEY));
}

export async function registerLocalUser(draft: AuthDraft): Promise<LocalAuthResult> {
  const name = draft.name.trim();
  const account = normalizeAccount(draft.account);
  const password = draft.password;

  if (!name || !account || password.length < 6) {
    return { ok: false, reason: "invalid" };
  }

  const users = await readUsers();
  if (users.some((user) => user.account === account)) {
    return { ok: false, reason: "exists" };
  }

  const nextUser: StoredUser = {
    id: `${Date.now()}`,
    name,
    account,
    password,
    createdAt: new Date().toISOString(),
  };

  await AsyncStorage.multiSet([
    [USERS_STORAGE_KEY, JSON.stringify([...users, nextUser])],
    [SESSION_STORAGE_KEY, account],
  ]);

  return { ok: true, profile: toProfile(nextUser) };
}

export async function loginLocalUser(draft: AuthDraft): Promise<LocalAuthResult> {
  const account = normalizeAccount(draft.account);
  const password = draft.password;

  if (!account || !password) {
    return { ok: false, reason: "invalid" };
  }

  const users = await readUsers();
  const user = users.find((item) => item.account === account && item.password === password);
  if (!user) {
    return { ok: false, reason: "not-found" };
  }

  await AsyncStorage.setItem(SESSION_STORAGE_KEY, account);
  return { ok: true, profile: toProfile(user) };
}

export function logoutLocalUser() {
  return AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}
