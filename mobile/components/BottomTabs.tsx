import { BookOpen, PieChart, Plus, Settings2, Wallet } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ThemePalette } from "../theme/presets";
import type { AppIcon, TabId } from "../types";

const tabs: Array<{ id: TabId; label: string; icon: AppIcon }> = [
  { id: "today", label: "账本", icon: BookOpen },
  { id: "stats", label: "统计", icon: PieChart },
  { id: "accounts", label: "账户", icon: Wallet },
  { id: "settings", label: "设置", icon: Settings2 },
];

export function BottomTabs({
  activeTab,
  theme,
  onChange,
  onAdd,
}: {
  activeTab: TabId;
  theme: ThemePalette;
  onChange: (id: TabId) => void;
  onAdd: () => void;
}) {
  return (
    <View style={[styles.tabBar, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
      {tabs.slice(0, 2).map((tab) => (
        <TabButton key={tab.id} tab={tab} theme={theme} selected={activeTab === tab.id} onPress={() => onChange(tab.id)} />
      ))}
      <Pressable
        style={[styles.fab, { backgroundColor: theme.coral, borderColor: theme.ground, shadowColor: theme.coral }]}
        onPress={onAdd}
        accessibilityLabel="快速记一笔"
      >
        <Plus size={28} color={theme.paper} strokeWidth={3} />
      </Pressable>
      {tabs.slice(2).map((tab) => (
        <TabButton key={tab.id} tab={tab} theme={theme} selected={activeTab === tab.id} onPress={() => onChange(tab.id)} />
      ))}
    </View>
  );
}

function TabButton({
  tab,
  theme,
  selected,
  onPress,
}: {
  tab: { id: TabId; label: string; icon: AppIcon };
  theme: ThemePalette;
  selected: boolean;
  onPress: () => void;
}) {
  const Icon = tab.icon;
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <Icon size={21} color={selected ? theme.green : theme.tabMuted} strokeWidth={selected ? 2.8 : 2.2} />
      <Text style={[styles.tabText, { color: selected ? theme.green : theme.tabMuted }]}>{tab.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 12,
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#372f24",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  tabButton: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "900",
  },
  fab: {
    width: 58,
    height: 58,
    marginTop: -28,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    shadowOpacity: 0.36,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
