import { ledgerBackupVersion } from "./defaults";
import { mergeAccountsWithLabels, normalizeLedgerSettings, readTransactions } from "./migrations";
import type { LedgerBackup, LedgerSettings, Transaction } from "./types";

export function createLedgerBackup(input: {
  transactions: Transaction[];
  settings: Record<string, unknown>;
  appVersion?: string;
}): LedgerBackup {
  const settings = normalizeLedgerSettings(input.settings);
  settings.accounts = mergeAccountsWithLabels(settings.accounts, [
    ...input.transactions.map((item) => item.account),
    ...settings.customTemplates.map((item) => item.account),
  ]);

  return {
    version: ledgerBackupVersion,
    exportedAt: new Date().toISOString(),
    appVersion: input.appVersion,
    transactions: input.transactions,
    settings,
  };
}

export type ParsedLedgerBackup = Omit<LedgerBackup, "settings"> & {
  settings: LedgerSettings & Record<string, unknown>;
};

export function parseLedgerBackup(value: string): ParsedLedgerBackup {
  const parsed = JSON.parse(value) as Partial<LedgerBackup>;
  const settings = normalizeLedgerSettings(parsed.settings ?? {});
  const transactions = readTransactions(parsed.transactions);
  settings.accounts = mergeAccountsWithLabels(settings.accounts, [
    ...transactions.map((item) => item.account),
    ...settings.customTemplates.map((item) => item.account),
  ]);

  return {
    version: Number(parsed.version) || 0,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    appVersion: typeof parsed.appVersion === "string" ? parsed.appVersion : undefined,
    transactions,
    settings,
  };
}
