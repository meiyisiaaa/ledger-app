import { ArrowDownRight, ArrowUpRight, Check, NotebookPen, Plus, X } from "lucide-react-native";
import { useEffect, useRef } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { formatCurrency as formatLedgerCurrency } from "../../packages/ledger-core/src";
import type { StoredAccount } from "../../packages/ledger-core/src";
import { palette, type ThemePalette } from "../theme/presets";
import type { Category, Draft } from "../types";
import { evaluateAmountInput } from "../utils/amountInput";

export type ComposerProps = {
  visible: boolean;
  draft: Draft;
  theme: ThemePalette;
  categories: Category[];
  accounts: StoredAccount[];
  expenseCategoryFallback: string;
  focusAmountKey: number;
  onClose: () => void;
  onChange: (draft: Draft) => void;
  onSubmit: (mode: "save-close" | "save-continue") => void;
  onSaveTemplate: () => void;
};

export function Composer({
  visible,
  draft,
  theme,
  categories,
  accounts,
  expenseCategoryFallback,
  focusAmountKey,
  onClose,
  onChange,
  onSubmit,
  onSaveTemplate,
}: ComposerProps) {
  const amountInputRef = useRef<TextInput>(null);
  const amountPreview = evaluateAmountInput(draft.amount);
  const composerCategories = draft.type === "income"
    ? categories.filter((item) => item.id === "income")
    : categories.filter((item) => item.id !== "income");
  const visibleAccounts = accounts.filter((account) => !account.hidden);

  useEffect(() => {
    if (!visible || focusAmountKey === 0) return;
    const timer = setTimeout(() => amountInputRef.current?.focus(), 220);
    return () => clearTimeout(timer);
  }, [focusAmountKey, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.composerSheet, { backgroundColor: theme.paper }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.paperDeep }]} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.eyebrow, { color: theme.green }]}>快速记账</Text>
              <Text style={[styles.sheetTitle, { color: theme.ink }]}>贴一张新账目</Text>
            </View>
            <Pressable style={[styles.closeButton, { backgroundColor: theme.paperDeep }]} onPress={onClose} accessibilityLabel="关闭">
              <X size={20} color={theme.ink} />
            </Pressable>
          </View>

          <View style={[styles.typeSwitch, { backgroundColor: theme.paperDeep }]}>
            <Pressable
              style={[styles.typeButton, draft.type === "expense" && { backgroundColor: theme.ink }]}
              onPress={() => onChange({ ...draft, type: "expense", category: draft.category === "income" ? expenseCategoryFallback : draft.category })}
            >
              <ArrowUpRight size={17} color={draft.type === "expense" ? theme.paper : theme.muted} />
              <Text style={[styles.typeText, draft.type === "expense" && styles.selectedTypeText]}>支出</Text>
            </Pressable>
            <Pressable
              style={[styles.typeButton, draft.type === "income" && { backgroundColor: theme.ink }]}
              onPress={() => onChange({ ...draft, type: "income", category: "income" })}
            >
              <ArrowDownRight size={17} color={draft.type === "income" ? theme.paper : theme.muted} />
              <Text style={[styles.typeText, draft.type === "income" && styles.selectedTypeText]}>收入</Text>
            </Pressable>
          </View>

          <TextInput
            ref={amountInputRef}
            value={draft.amount}
            onChangeText={(amount) => onChange({ ...draft, amount })}
            keyboardType="numbers-and-punctuation"
            placeholder="¥ 0 或 12+8"
            placeholderTextColor="#a69b8c"
            style={[styles.amountInput, { color: theme.ink, backgroundColor: theme.field }]}
          />
          {amountPreview !== null && draft.amount.trim() ? (
            <Text style={[styles.amountPreview, { color: theme.green }]}>
              将记为 {formatLedgerCurrency(amountPreview).replace("CN¥", "¥")}
            </Text>
          ) : null}
          <TextInput
            value={draft.title}
            onChangeText={(title) => onChange({ ...draft, title })}
            placeholder="事项，例如晚餐、工资、房租"
            placeholderTextColor="#a69b8c"
            style={[styles.textInput, { color: theme.ink, backgroundColor: theme.field }]}
          />

          <Text style={[styles.inputLabel, { color: theme.muted }]}>分类</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPicker}>
            {composerCategories.map((category) => {
              const Icon = category.icon;
              const selected = draft.category === category.id;
              return (
                <Pressable
                  key={category.id}
                  style={[styles.categoryChip, selected && { borderColor: category.color, backgroundColor: category.soft }]}
                  onPress={() => onChange({ ...draft, category: category.id })}
                >
                  <Icon size={17} color={category.color} />
                  <Text style={styles.categoryChipText}>{category.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.inputLabel, { color: theme.muted }]}>账户</Text>
          <View style={styles.accountPicker}>
            {visibleAccounts.map((account) => (
              <Pressable
                key={account.id}
                style={[
                  styles.accountChip,
                  { backgroundColor: theme.paperDeep },
                  draft.account === account.label && { backgroundColor: theme.green },
                ]}
                onPress={() => onChange({ ...draft, account: account.label })}
              >
                <Text style={[styles.accountChipText, { color: draft.account === account.label ? theme.paper : theme.muted }]}>
                  {account.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={draft.note}
            onChangeText={(note) => onChange({ ...draft, note })}
            placeholder="备注一点消费心情"
            placeholderTextColor="#a69b8c"
            style={[styles.textInput, { color: theme.ink, backgroundColor: theme.field }]}
          />

          <View style={styles.submitRow}>
            <Pressable style={[styles.submitButton, { backgroundColor: theme.coral }]} onPress={() => onSubmit("save-close")}>
              <Check size={19} color={theme.paper} />
              <Text style={styles.submitText}>记一笔</Text>
            </Pressable>
            <Pressable
              style={[styles.continueButton, { borderColor: theme.panelBorder, backgroundColor: theme.paperDeep }]}
              onPress={() => onSubmit("save-continue")}
            >
              <Plus size={17} color={theme.ink} />
              <Text style={[styles.continueText, { color: theme.ink }]}>继续记</Text>
            </Pressable>
          </View>
          <Pressable
            style={[styles.saveTemplateButton, { borderColor: theme.panelBorder, backgroundColor: theme.paperDeep }]}
            onPress={onSaveTemplate}
          >
            <NotebookPen size={17} color={theme.ink} />
            <Text style={[styles.saveTemplateText, { color: theme.ink }]}>保存为常用模板</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(45, 42, 36, 0.28)",
  },
  composerSheet: {
    maxHeight: "92%",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    marginBottom: 14,
    borderRadius: 999,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
  },
  sheetTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  typeSwitch: {
    flexDirection: "row",
    gap: 8,
    padding: 4,
    marginBottom: 16,
    borderRadius: 16,
  },
  typeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  typeText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "900",
  },
  selectedTypeText: {
    color: palette.paper,
  },
  amountInput: {
    minHeight: 64,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 14,
    color: palette.ink,
    fontSize: 32,
    fontWeight: "900",
  },
  amountPreview: {
    marginTop: -4,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "900",
  },
  textInput: {
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 14,
    color: palette.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  inputLabel: {
    marginBottom: 8,
    color: palette.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  categoryPicker: {
    gap: 8,
    paddingBottom: 12,
  },
  categoryChip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "#f4e7d1",
  },
  categoryChipText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  accountPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  accountChip: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  accountChipText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "900",
  },
  submitButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: {
    color: palette.paper,
    fontSize: 15,
    fontWeight: "900",
  },
  saveTemplateButton: {
    minHeight: 46,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveTemplateText: {
    fontSize: 14,
    fontWeight: "900",
  },
  submitRow: {
    flexDirection: "row",
    gap: 10,
  },
  continueButton: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  continueText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "900",
  },
});
