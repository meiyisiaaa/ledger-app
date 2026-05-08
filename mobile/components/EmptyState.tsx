import { NotebookPen, Plus } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette, type ThemePalette } from "../theme/presets";

export function EmptyState({
  title,
  desc,
  action,
  secondaryAction,
  theme,
  onPress,
  onSecondaryPress,
}: {
  title: string;
  desc: string;
  action?: string;
  secondaryAction?: string;
  theme: ThemePalette;
  onPress?: () => void;
  onSecondaryPress?: () => void;
}) {
  return (
    <View style={[styles.emptyState, { borderColor: theme.panelBorder }]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.paperDeep }]}>
        <NotebookPen size={22} color={theme.green} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.ink }]}>{title}</Text>
      <Text style={[styles.emptyDesc, { color: theme.muted }]}>{desc}</Text>
      {action && onPress ? (
        <View style={styles.emptyActions}>
          <Pressable style={[styles.emptyAction, { backgroundColor: theme.green }]} onPress={onPress}>
            <Plus size={16} color={theme.paper} />
            <Text style={styles.emptyActionText}>{action}</Text>
          </Pressable>
          {secondaryAction && onSecondaryPress ? (
            <Pressable
              style={[styles.secondaryAction, { borderColor: theme.panelBorder, backgroundColor: theme.paperDeep }]}
              onPress={onSecondaryPress}
            >
              <Text style={[styles.secondaryActionText, { color: theme.ink }]}>{secondaryAction}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
    borderRadius: 16,
    backgroundColor: "rgba(255, 249, 236, 0.72)",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d9f2ea",
    marginBottom: 10,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  emptyDesc: {
    maxWidth: 230,
    marginTop: 6,
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "center",
  },
  emptyAction: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyActionText: {
    color: palette.paper,
    fontSize: 13,
    fontWeight: "900",
  },
  emptyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  secondaryAction: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "900",
  },
});
