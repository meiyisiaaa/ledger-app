import { Eye, EyeOff, Plus, Trash2, Wallet } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { formatCurrency as formatLedgerCurrency } from "../../packages/ledger-core/src";
import type { QuickTemplate, StoredAccount, Transaction } from "../../packages/ledger-core/src";
import { palette, type ThemePalette } from "../theme/presets";

export function AccountsScreen({
  accounts,
  transactions,
  templates,
  theme,
  onAddAccount,
  onRenameAccount,
  onHideAccount,
  onDeleteAccount,
}: {
  accounts: StoredAccount[];
  transactions: Transaction[];
  templates: QuickTemplate[];
  theme: ThemePalette;
  onAddAccount: (label: string) => void;
  onRenameAccount: (id: string, label: string) => void;
  onHideAccount: (id: string, hidden: boolean) => void;
  onDeleteAccount: (id: string) => void;
}) {
  const [newAccountLabel, setNewAccountLabel] = useState("");
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraftLabels(Object.fromEntries(accounts.map((account) => [account.id, account.label])));
  }, [accounts]);

  const accountTotals = useMemo(() => {
    return accounts.map((account) => {
      const movement = transactions.reduce((sum, item) => {
        if (item.account !== account.label) return sum;
        return item.type === "income" ? sum + item.amount : sum - item.amount;
      }, 0);
      const usageCount =
        transactions.filter((item) => item.account === account.label).length +
        templates.filter((template) => template.account === account.label).length;
      return { account, balance: movement, usageCount };
    });
  }, [accounts, templates, transactions]);

  function submitNewAccount() {
    onAddAccount(newAccountLabel);
    setNewAccountLabel("");
  }

  return (
    <View>
      <SectionTitle label="账户" title="我的钱袋" theme={theme} />
      <View style={[styles.paperPanel, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <Text style={[styles.panelHint, { color: theme.muted }]}>
          隐藏账户不会删除历史流水；已被账目或模板引用的账户只能隐藏。
        </Text>
        <View style={styles.addAccountRow}>
          <TextInput
            value={newAccountLabel}
            onChangeText={setNewAccountLabel}
            onSubmitEditing={submitNewAccount}
            placeholder="新增账户，例如招商卡"
            placeholderTextColor="#a69b8c"
            style={[styles.accountInput, { color: theme.ink, backgroundColor: theme.field }]}
          />
          <Pressable style={[styles.addButton, { backgroundColor: theme.green }]} onPress={submitNewAccount}>
            <Plus size={17} color={theme.paper} />
          </Pressable>
        </View>

        {accountTotals.map(({ account, balance, usageCount }, index) => (
          <View key={account.id} style={[styles.accountRow, account.hidden && { opacity: 0.58 }]}>
            <View style={[styles.accountBadge, { backgroundColor: index % 2 === 0 ? "#d9f2ea" : "#dce9ff" }]}>
              <Wallet size={18} color={index % 2 === 0 ? theme.green : theme.blue} />
            </View>
            <View style={styles.accountText}>
              <TextInput
                value={draftLabels[account.id] ?? account.label}
                onChangeText={(value) => setDraftLabels((current) => ({ ...current, [account.id]: value }))}
                onBlur={() => onRenameAccount(account.id, draftLabels[account.id] ?? account.label)}
                onSubmitEditing={() => onRenameAccount(account.id, draftLabels[account.id] ?? account.label)}
                style={[styles.accountNameInput, { color: theme.ink }]}
              />
              <Text style={[styles.accountMeta, { color: theme.muted }]}>
                {account.hidden ? "已隐藏" : "可记账"} · {usageCount} 条引用
              </Text>
            </View>
            <View style={styles.accountRight}>
              <Text style={[styles.accountBalance, { color: theme.ink }]}>{formatLedgerCurrency(balance)}</Text>
              <View style={styles.accountActions}>
                <Pressable
                  style={[styles.iconButton, { backgroundColor: theme.paperDeep }]}
                  onPress={() => onHideAccount(account.id, !account.hidden)}
                  accessibilityLabel={account.hidden ? `恢复${account.label}` : `隐藏${account.label}`}
                >
                  {account.hidden ? <Eye size={15} color={theme.green} /> : <EyeOff size={15} color={theme.muted} />}
                </Pressable>
                <Pressable
                  style={[styles.iconButton, { backgroundColor: theme.paperDeep }]}
                  onPress={() => onDeleteAccount(account.id)}
                  accessibilityLabel={`删除${account.label}`}
                >
                  <Trash2 size={15} color={theme.coral} />
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function SectionTitle({ label, title, theme }: { label: string; title: string; theme: ThemePalette }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.eyebrow, { color: theme.green }]}>{label}</Text>
      <Text style={[styles.sectionHeading, { color: theme.ink }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
  },
  sectionHeading: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
  },
  paperPanel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
  },
  addAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  panelHint: {
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  accountInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "800",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(45, 42, 36, 0.12)",
  },
  accountBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  accountText: {
    flex: 1,
    minWidth: 0,
  },
  accountNameInput: {
    minHeight: 30,
    padding: 0,
    color: palette.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  accountMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  accountRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  accountBalance: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  accountActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
