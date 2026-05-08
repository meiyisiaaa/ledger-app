import { currentLedgerSchemaVersion, parseLedgerBackup, type ParsedLedgerBackup } from "../../packages/ledger-core/src";

export type BackupValidationResult =
  | { status: "empty"; message: string }
  | { status: "invalid-json"; message: string }
  | { status: "no-transactions"; message: string }
  | {
      status: "ok";
      parsed: ParsedLedgerBackup;
      isLegacy: boolean;
      summary: {
        transactions: number;
        templates: number;
        categories: number;
        accounts: number;
      };
    };

export function validateBackupText(value: string): BackupValidationResult {
  const text = value.trim();
  if (!text) {
    return { status: "empty", message: "请先粘贴完整的 JSON 备份内容。" };
  }

  try {
    const parsed = parseLedgerBackup(text);
    if (parsed.transactions.length === 0) {
      return { status: "no-transactions", message: "备份里没有可恢复的有效账目。" };
    }

    return {
      status: "ok",
      parsed,
      isLegacy: parsed.version > 0 && parsed.version < currentLedgerSchemaVersion,
      summary: {
        transactions: parsed.transactions.length,
        templates: parsed.settings.customTemplates.length,
        categories: parsed.settings.customCategories.length,
        accounts: parsed.settings.accounts.length,
      },
    };
  } catch {
    return { status: "invalid-json", message: "JSON 格式不正确，请检查是否完整粘贴。" };
  }
}
