import { Trash2 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatCurrency as formatLedgerCurrency } from "../../packages/ledger-core/src";
import type { Transaction } from "../../packages/ledger-core/src";
import { palette, type ThemePalette } from "../theme/presets";
import type { Category } from "../types";

export function TransactionRow({
  item,
  theme,
  categories,
  onOpen,
  onDelete,
  onRepeat,
}: {
  item: Transaction;
  theme: ThemePalette;
  categories: Category[];
  onOpen: () => void;
  onDelete: (id: string) => void;
  onRepeat: (item: Transaction) => void;
}) {
  const category = categories.find((entry) => entry.id === item.category) ?? categories[0];
  const Icon = category.icon;
  const amount = `${item.type === "income" ? "+" : "-"}${formatLedgerCurrency(item.amount).replace("CN¥", "¥")}`;

  return (
    <Pressable
      style={[styles.transactionRow, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}
      onPress={onOpen}
      onLongPress={() => onRepeat(item)}
      delayLongPress={320}
      accessibilityLabel={`${item.title}，长按复制一笔`}
    >
      <View style={[styles.sticker, { backgroundColor: category.soft }]}>
        <Icon size={19} color={category.color} />
      </View>
      <View style={styles.transactionBody}>
        <Text numberOfLines={1} style={[styles.transactionTitle, { color: theme.ink }]}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={[styles.transactionMeta, { color: theme.muted }]}>
          {category.label} · {item.account} · {item.note}
        </Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[styles.transactionAmount, { color: item.type === "income" ? theme.green : theme.coral }]}>
          {amount}
        </Text>
        <Text style={[styles.transactionDate, { color: theme.muted }]}>{item.date.slice(5).replace("-", "/")}</Text>
      </View>
      <Pressable
        style={[styles.deleteButton, { backgroundColor: theme.paperDeep }]}
        onPress={(event) => {
          event.stopPropagation();
          onDelete(item.id);
        }}
        accessibilityLabel={`删除${item.title}`}
      >
        <Trash2 size={16} color="#9b5d4d" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  transactionRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#372f24",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sticker: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionBody: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  transactionMeta: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "900",
  },
  transactionDate: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
