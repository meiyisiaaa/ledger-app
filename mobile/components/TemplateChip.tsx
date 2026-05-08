import { X } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatCurrency as formatLedgerCurrency } from "../../packages/ledger-core/src";
import type { QuickTemplate } from "../../packages/ledger-core/src";
import { palette, type ThemePalette } from "../theme/presets";
import type { Category } from "../types";

export function TemplateChip({
  template,
  theme,
  categories,
  onPress,
  onRemove,
}: {
  template: QuickTemplate;
  theme: ThemePalette;
  categories: Category[];
  onPress: () => void;
  onRemove?: () => void;
}) {
  const category = categories.find((item) => item.id === template.category) ?? categories[0];
  const Icon = category.icon;

  return (
    <Pressable
      style={[styles.templateChip, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}
      onPress={onPress}
      accessibilityLabel={`套用模板${template.title}`}
    >
      <View style={[styles.templateIcon, { backgroundColor: category.soft }]}>
        <Icon size={16} color={category.color} />
      </View>
      <View style={styles.templateCopy}>
        <Text numberOfLines={1} style={[styles.templateName, { color: theme.ink }]}>
          {template.title}
        </Text>
        <Text numberOfLines={1} style={[styles.templateAmount, { color: theme.muted }]}>
          {!template.amount || template.amount === "0" ? "自填金额" : formatLedgerCurrency(Number(template.amount) || 0).replace("CN¥", "¥")}
        </Text>
      </View>
      {onRemove ? (
        <Pressable
          style={styles.templateRemove}
          onPress={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          accessibilityLabel={`删除模板${template.title}`}
        >
          <X size={13} color={theme.muted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  templateChip: {
    width: 142,
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  templateIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  templateCopy: {
    flex: 1,
    minWidth: 0,
  },
  templateName: {
    fontSize: 14,
    fontWeight: "900",
  },
  templateAmount: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  templateRemove: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.32)",
  },
});
