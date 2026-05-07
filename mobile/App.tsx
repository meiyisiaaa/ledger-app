import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Car,
  Check,
  CircleDollarSign,
  Coffee,
  Gift,
  HeartPulse,
  Home,
  LockKeyhole,
  LogIn,
  LogOut,
  NotebookPen,
  Palette,
  PieChart,
  Plus,
  ReceiptText,
  Settings2,
  ShoppingBag,
  Trash2,
  Utensils,
  UserPlus,
  Wallet,
  X,
} from "lucide-react-native";

type EntryType = "expense" | "income";
type TabId = "today" | "stats" | "accounts" | "settings";
type AuthMode = "login" | "register";

type AppIcon = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

type Category = {
  id: string;
  label: string;
  color: string;
  soft: string;
  icon: AppIcon;
};

type Transaction = {
  id: string;
  type: EntryType;
  title: string;
  category: string;
  amount: number;
  account: string;
  date: string;
  note: string;
};

type Draft = {
  type: EntryType;
  title: string;
  amount: string;
  category: string;
  account: string;
  note: string;
};

type UserProfile = {
  id: string;
  name: string;
  account: string;
  createdAt: string;
};

type StoredUser = UserProfile & {
  password: string;
};

type AuthDraft = {
  name: string;
  account: string;
  password: string;
};

const STORAGE_KEY = "ledger-journal-mobile:v2";
const THEME_STORAGE_KEY = "ledger-journal-mobile:theme";
const USERS_STORAGE_KEY = "ledger-journal-mobile:users";
const SESSION_STORAGE_KEY = "ledger-journal-mobile:session";
const LEGACY_STORAGE_KEYS = ["ledger-journal-mobile:v1"];

const palette = {
  ink: "#2d2a24",
  muted: "#736b5f",
  paper: "#fff9ec",
  paperDeep: "#f1e4cd",
  ground: "#f8f3e7",
  green: "#227c70",
  coral: "#d95f3d",
  blue: "#3d6fb6",
  yellow: "#f7cf72",
  line: "rgba(61, 111, 182, 0.16)",
};

type ThemeId = "classic" | "mint" | "berry" | "blueprint";
type ThemePalette = typeof palette & {
  id: ThemeId;
  name: string;
  desc: string;
  field: string;
  tabMuted: string;
  panelBorder: string;
  swatches: string[];
};

const themePresets: Record<ThemeId, ThemePalette> = {
  classic: {
    ...palette,
    id: "classic",
    name: "纸本绿",
    desc: "温和纸张，适合日常记账",
    field: "#f7eddb",
    tabMuted: "#8b8376",
    panelBorder: "rgba(45, 42, 36, 0.14)",
    swatches: ["#f8f3e7", "#fff9ec", "#227c70", "#d95f3d"],
  },
  mint: {
    ...palette,
    id: "mint",
    name: "薄荷本",
    desc: "清爽绿调，分类更醒目",
    ink: "#20332d",
    muted: "#66776f",
    paper: "#fbfff8",
    paperDeep: "#dfeee4",
    ground: "#eef8ef",
    green: "#15866d",
    coral: "#df7052",
    blue: "#3777a8",
    yellow: "#f5d779",
    line: "rgba(21, 134, 109, 0.13)",
    field: "#ecf7ec",
    tabMuted: "#76827c",
    panelBorder: "rgba(21, 134, 109, 0.16)",
    swatches: ["#eef8ef", "#fbfff8", "#15866d", "#df7052"],
  },
  berry: {
    ...palette,
    id: "berry",
    name: "莓果本",
    desc: "柔和粉调，适合生活手账",
    ink: "#35262c",
    muted: "#7a6870",
    paper: "#fff8f6",
    paperDeep: "#f4dfe1",
    ground: "#fbefef",
    green: "#2f7a62",
    coral: "#c95471",
    blue: "#6e6fb3",
    yellow: "#f4c86d",
    line: "rgba(201, 84, 113, 0.13)",
    field: "#f9e9e9",
    tabMuted: "#8a777d",
    panelBorder: "rgba(201, 84, 113, 0.15)",
    swatches: ["#fbefef", "#fff8f6", "#c95471", "#2f7a62"],
  },
  blueprint: {
    ...palette,
    id: "blueprint",
    name: "蓝灰本",
    desc: "冷静蓝灰，统计页更干净",
    ink: "#202d36",
    muted: "#64717a",
    paper: "#fbfdff",
    paperDeep: "#dce8f0",
    ground: "#eef3f7",
    green: "#287468",
    coral: "#d46348",
    blue: "#2f6fae",
    yellow: "#efd27a",
    line: "rgba(47, 111, 174, 0.14)",
    field: "#eaf2f8",
    tabMuted: "#6f7a83",
    panelBorder: "rgba(47, 111, 174, 0.15)",
    swatches: ["#eef3f7", "#fbfdff", "#2f6fae", "#d46348"],
  },
};

const defaultThemeId: ThemeId = "classic";

function isThemeId(value: string | null): value is ThemeId {
  return Boolean(value && value in themePresets);
}

const categories: Category[] = [
  { id: "food", label: "餐饮", color: "#d95f3d", soft: "#ffe1d5", icon: Utensils },
  { id: "daily", label: "日用", color: "#227c70", soft: "#d9f2ea", icon: ShoppingBag },
  { id: "traffic", label: "交通", color: "#3d6fb6", soft: "#dce9ff", icon: Car },
  { id: "health", label: "健康", color: "#b84a6b", soft: "#ffdce8", icon: HeartPulse },
  { id: "gift", label: "人情", color: "#7c5bb3", soft: "#ebe1ff", icon: Gift },
  { id: "coffee", label: "咖啡", color: "#8a5b2d", soft: "#f5e1c8", icon: Coffee },
  { id: "income", label: "收入", color: "#2d8a56", soft: "#dcf7e8", icon: CircleDollarSign },
];

const accounts = ["微信钱包", "支付宝", "储蓄卡", "现金袋"];
const monthlyBudget = 5200;
const savingsTarget = 3600;

const tabs: Array<{ id: TabId; label: string; icon: AppIcon }> = [
  { id: "today", label: "账本", icon: BookOpen },
  { id: "stats", label: "统计", icon: PieChart },
  { id: "accounts", label: "账户", icon: Wallet },
  { id: "settings", label: "设置", icon: Settings2 },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

function getCategory(id: string) {
  return categories.find((category) => category.id === id) ?? categories[0];
}

function todayLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
}

function normalizeAccount(value: string) {
  return value.trim().toLowerCase();
}

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [themeId, setThemeId] = useState<ThemeId>(defaultThemeId);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [authDraft, setAuthDraft] = useState<AuthDraft>({
    name: "",
    account: "",
    password: "",
  });
  const [draft, setDraft] = useState<Draft>({
    type: "expense",
    title: "",
    amount: "",
    category: "food",
    account: accounts[0],
    note: "",
  });
  const theme = themePresets[themeId];

  useEffect(() => {
    async function restore() {
      try {
        await AsyncStorage.multiRemove(LEGACY_STORAGE_KEYS);
        const [savedThemeId, rawTransactions, rawUsers, savedSession] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(USERS_STORAGE_KEY),
          AsyncStorage.getItem(SESSION_STORAGE_KEY),
        ]);
        if (isThemeId(savedThemeId)) {
          setThemeId(savedThemeId);
        }
        if (rawTransactions) {
          setTransactions(JSON.parse(rawTransactions) as Transaction[]);
        }
        if (rawUsers && savedSession) {
          const users = JSON.parse(rawUsers) as StoredUser[];
          const sessionUser = users.find((user) => user.account === savedSession);
          if (sessionUser) {
            const { password: _password, ...profile } = sessionUser;
            setCurrentUser(profile);
          }
        }
      } finally {
        setHydrated(true);
      }
    }
    restore();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [hydrated, transactions]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(THEME_STORAGE_KEY, themeId);
  }, [hydrated, themeId]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (sum, item) => {
        if (item.type === "income") sum.income += item.amount;
        if (item.type === "expense") sum.expense += item.amount;
        return sum;
      },
      { income: 0, expense: 0 },
    );
  }, [transactions]);

  const netBalance = totals.income - totals.expense;
  const budgetLeft = monthlyBudget - totals.expense;
  const budgetRate = Math.min(totals.expense / monthlyBudget, 1);
  const savingsRate = Math.min(Math.max(netBalance, 0) / savingsTarget, 1);

  const categoryTotals = useMemo(() => {
    return categories
      .filter((category) => category.id !== "income")
      .map((category) => ({
        ...category,
        total: transactions
          .filter((item) => item.type === "expense" && item.category === category.id)
          .reduce((sum, item) => sum + item.amount, 0),
      }))
      .filter((category) => category.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  function switchTab(id: TabId) {
    Haptics.selectionAsync();
    setActiveTab(id);
  }

  function openComposer(type: EntryType = "expense") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft((current) => ({ ...current, type, category: type === "income" ? "income" : "food" }));
    setComposerOpen(true);
  }

  function submitDraft() {
    const amount = Number(draft.amount.replace(",", "."));
    if (!draft.title.trim() || Number.isNaN(amount) || amount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("还差一点", "请填写事项和正确的金额。");
      return;
    }

    const next: Transaction = {
      id: `${Date.now()}`,
      type: draft.type,
      title: draft.title.trim(),
      amount,
      category: draft.type === "income" ? "income" : draft.category,
      account: draft.account,
      note: draft.note.trim() || "随手记一笔",
      date: new Date().toISOString().slice(0, 10),
    };

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTransactions((current) => [next, ...current]);
    setDraft({
      type: "expense",
      title: "",
      amount: "",
      category: "food",
      account: draft.account,
      note: "",
    });
    setComposerOpen(false);
    setActiveTab("today");
  }

  function deleteEntry(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTransactions((current) => current.filter((item) => item.id !== id));
  }

  async function clearLocalData() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.multiRemove([STORAGE_KEY, ...LEGACY_STORAGE_KEYS]);
    setTransactions([]);
    Alert.alert("已清除", "本地账目和旧演示缓存已经清空。");
  }

  function changeTheme(nextThemeId: ThemeId) {
    Haptics.selectionAsync();
    setThemeId(nextThemeId);
  }

  async function readUsers() {
    const raw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  }

  async function handleRegister() {
    const name = authDraft.name.trim();
    const account = normalizeAccount(authDraft.account);
    const password = authDraft.password;

    if (!name || !account || password.length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("注册信息不完整", "请填写昵称、手机号或邮箱，并设置至少 6 位密码。");
      return;
    }

    const users = await readUsers();
    if (users.some((user) => user.account === account)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("账号已存在", "请直接登录，或换一个手机号/邮箱。");
      return;
    }

    const nextUser: StoredUser = {
      id: `${Date.now()}`,
      name,
      account,
      password,
      createdAt: new Date().toISOString(),
    };
    const { password: _password, ...profile } = nextUser;
    await AsyncStorage.multiSet([
      [USERS_STORAGE_KEY, JSON.stringify([...users, nextUser])],
      [SESSION_STORAGE_KEY, account],
    ]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCurrentUser(profile);
    setAuthDraft({ name: "", account: "", password: "" });
  }

  async function handleLogin() {
    const account = normalizeAccount(authDraft.account);
    const password = authDraft.password;

    if (!account || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("登录信息不完整", "请填写手机号/邮箱和密码。");
      return;
    }

    const users = await readUsers();
    const user = users.find((item) => item.account === account && item.password === password);
    if (!user) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("登录失败", "账号或密码不正确。");
      return;
    }

    const { password: _password, ...profile } = user;
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, account);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCurrentUser(profile);
    setAuthDraft({ name: "", account: "", password: "" });
  }

  async function logout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    setCurrentUser(null);
    setComposerOpen(false);
    setActiveTab("today");
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={theme.ground} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.ground }]}>
        {!hydrated ? (
          <LoadingScreen theme={theme} />
        ) : !currentUser ? (
          <AuthScreen
            draft={authDraft}
            theme={theme}
            onChange={setAuthDraft}
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
        ) : (
        <View style={[styles.app, { backgroundColor: theme.ground }]}>
          <Header theme={theme} user={currentUser} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {activeTab === "today" && (
              <TodayScreen
                transactions={transactions}
                totals={totals}
                netBalance={netBalance}
                budgetLeft={budgetLeft}
                budgetRate={budgetRate}
                theme={theme}
                onOpenComposer={openComposer}
                onDelete={deleteEntry}
              />
            )}
            {activeTab === "stats" && (
              <StatsScreen
                totals={totals}
                categoryTotals={categoryTotals}
                savingsRate={savingsRate}
                budgetRate={budgetRate}
                theme={theme}
              />
            )}
            {activeTab === "accounts" && <AccountsScreen transactions={transactions} theme={theme} />}
            {activeTab === "settings" && (
              <SettingsScreen
                activeThemeId={themeId}
                theme={theme}
                user={currentUser}
                onChangeTheme={changeTheme}
                onClearData={clearLocalData}
                onLogout={logout}
              />
            )}
          </ScrollView>

          <BottomTabs activeTab={activeTab} theme={theme} onChange={switchTab} onAdd={() => openComposer("expense")} />
          <Composer
            visible={composerOpen}
            draft={draft}
            theme={theme}
            onClose={() => setComposerOpen(false)}
            onChange={setDraft}
            onSubmit={submitDraft}
          />
        </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Header({ theme, user }: { theme: ThemePalette; user: UserProfile }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={[styles.eyebrow, { color: theme.green }]}>May 2026</Text>
        <Text style={[styles.title, { color: theme.ink }]}>小账本</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable style={[styles.iconButton, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]} accessibilityLabel="今日提醒">
          <Bell size={20} color={theme.ink} />
        </Pressable>
        <View style={[styles.avatar, { backgroundColor: theme.ink }]}>
          <Text style={[styles.avatarInitial, { color: theme.paper }]}>{user.name.slice(0, 1)}</Text>
        </View>
      </View>
    </View>
  );
}

function LoadingScreen({ theme }: { theme: ThemePalette }) {
  return (
    <View style={[styles.authRoot, { backgroundColor: theme.ground }]}>
      <View style={[styles.loadingMark, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <NotebookPen size={26} color={theme.green} />
      </View>
      <Text style={[styles.loadingText, { color: theme.muted }]}>正在打开账本</Text>
    </View>
  );
}

function AuthScreen({
  draft,
  theme,
  onChange,
  onLogin,
  onRegister,
}: {
  draft: AuthDraft;
  theme: ThemePalette;
  onChange: (draft: AuthDraft) => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const isRegister = mode === "register";

  function submit() {
    if (isRegister) {
      onRegister();
    } else {
      onLogin();
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.authRoot, { backgroundColor: theme.ground }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.authScroll}
      >
        <View style={styles.authBrand}>
          <View style={[styles.authBadge, { backgroundColor: theme.ink }]}>
            <NotebookPen size={28} color={theme.paper} />
          </View>
          <Text style={[styles.eyebrow, { color: theme.green }]}>Ledger Journal</Text>
          <Text style={[styles.authTitle, { color: theme.ink }]}>小账本</Text>
          <Text style={[styles.authSubtitle, { color: theme.muted }]}>登录后同步你的手账主题、流水和本机账本。</Text>
        </View>

        <View style={[styles.authCard, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
          <View style={[styles.authTape, { backgroundColor: theme.yellow }]} />
          <View style={[styles.authSwitch, { backgroundColor: theme.paperDeep }]}>
            <Pressable
              style={[styles.authSwitchButton, !isRegister && { backgroundColor: theme.ink }]}
              onPress={() => setMode("login")}
            >
              <LogIn size={16} color={!isRegister ? theme.paper : theme.muted} />
              <Text style={[styles.authSwitchText, { color: !isRegister ? theme.paper : theme.muted }]}>登录</Text>
            </Pressable>
            <Pressable
              style={[styles.authSwitchButton, isRegister && { backgroundColor: theme.ink }]}
              onPress={() => setMode("register")}
            >
              <UserPlus size={16} color={isRegister ? theme.paper : theme.muted} />
              <Text style={[styles.authSwitchText, { color: isRegister ? theme.paper : theme.muted }]}>注册</Text>
            </Pressable>
          </View>

          {isRegister ? (
            <LabeledInput
              label="昵称"
              value={draft.name}
              theme={theme}
              placeholder="例如：小林"
              onChangeText={(name) => onChange({ ...draft, name })}
            />
          ) : null}
          <LabeledInput
            label="手机号 / 邮箱"
            value={draft.account}
            theme={theme}
            placeholder="用于登录"
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(account) => onChange({ ...draft, account })}
          />
          <LabeledInput
            label="密码"
            value={draft.password}
            theme={theme}
            placeholder="至少 6 位"
            secureTextEntry
            onChangeText={(password) => onChange({ ...draft, password })}
          />

          <Pressable style={[styles.authSubmit, { backgroundColor: theme.coral }]} onPress={submit}>
            {isRegister ? <UserPlus size={18} color={theme.paper} /> : <LockKeyhole size={18} color={theme.paper} />}
            <Text style={styles.authSubmitText}>{isRegister ? "创建账号" : "登录账本"}</Text>
          </Pressable>

          <Text style={[styles.authHint, { color: theme.muted }]}>
            当前版本为本机原型账号；上线时会替换为后端认证、加密存储和短信/邮箱验证。
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LabeledInput({
  label,
  value,
  theme,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  onChangeText,
}: {
  label: string;
  value: string;
  theme: ThemePalette;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.authField}>
      <Text style={[styles.inputLabel, { color: theme.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#a69b8c"
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={[styles.textInput, styles.authInput, { color: theme.ink, backgroundColor: theme.field }]}
      />
    </View>
  );
}

function TodayScreen({
  transactions,
  totals,
  netBalance,
  budgetLeft,
  budgetRate,
  theme,
  onOpenComposer,
  onDelete,
}: {
  transactions: Transaction[];
  totals: { income: number; expense: number };
  netBalance: number;
  budgetLeft: number;
  budgetRate: number;
  theme: ThemePalette;
  onOpenComposer: (type?: EntryType) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View>
      <View style={[styles.heroPage, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <View style={[styles.pageLines, { borderColor: theme.line }]} pointerEvents="none" />
        <View style={[styles.tape, { backgroundColor: theme.yellow }]} />
        <View style={styles.heroTop}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.green }]}>本月结余</Text>
            <Text style={[styles.balance, netBalance < 0 && styles.balanceWarn]}>
              {formatCurrency(netBalance)}
            </Text>
          </View>
          <View style={[styles.dateSticker, { backgroundColor: theme.paperDeep, borderColor: theme.blue }]}>
            <CalendarDays size={16} color={theme.blue} />
            <Text style={styles.dateText}>{todayLabel()}</Text>
          </View>
        </View>

        <View style={styles.heroStats}>
          <View>
            <Text style={styles.statLabel}>收入</Text>
            <Text style={styles.statValue}>{formatCurrency(totals.income)}</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>支出</Text>
            <Text style={[styles.statValue, styles.coralText]}>{formatCurrency(totals.expense)}</Text>
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.statLabel}>月预算剩余</Text>
            <Text style={styles.progressAmount}>{formatCurrency(budgetLeft)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${budgetRate * 100}%`, backgroundColor: theme.green }]} />
          </View>
        </View>

        <View style={styles.quickActions}>
          <Pressable style={[styles.quickButton, { backgroundColor: theme.coral }]} onPress={() => onOpenComposer("expense")}>
            <ArrowUpRight size={18} color={theme.paper} />
            <Text style={styles.quickButtonText}>记支出</Text>
          </Pressable>
          <Pressable style={[styles.quickButton, { backgroundColor: theme.green }]} onPress={() => onOpenComposer("income")}>
            <ArrowDownRight size={18} color={theme.paper} />
            <Text style={styles.quickButtonText}>记收入</Text>
          </Pressable>
        </View>
      </View>

      <SectionTitle label="流水" title="最近贴纸" theme={theme} />
      <View style={styles.ledgerList}>
        {transactions.length === 0 ? (
          <EmptyState
            title="还没有账目"
            desc="点底部加号或上面的按钮，开始记录第一笔。"
            action="记一笔"
            theme={theme}
            onPress={() => onOpenComposer("expense")}
          />
        ) : (
          transactions.map((item) => (
            <TransactionRow key={item.id} item={item} onDelete={onDelete} />
          ))
        )}
      </View>
    </View>
  );
}

function StatsScreen({
  totals,
  categoryTotals,
  savingsRate,
  budgetRate,
  theme,
}: {
  totals: { income: number; expense: number };
  categoryTotals: Array<Category & { total: number }>;
  savingsRate: number;
  budgetRate: number;
  theme: ThemePalette;
}) {
  return (
    <View>
      <SectionTitle label="统计" title="月度复盘" theme={theme} />
      <View style={[styles.paperPanel, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <View style={styles.panelHeader}>
          <BarChart3 size={22} color={theme.green} />
          <Text style={styles.panelTitle}>预算和储蓄</Text>
        </View>
        <MetricLine label="预算使用" value={`${Math.round(budgetRate * 100)}%`} color={theme.coral} rate={budgetRate} />
        <MetricLine label="储蓄目标" value={`${Math.round(savingsRate * 100)}%`} color={theme.blue} rate={savingsRate} />
        <View style={styles.statPair}>
          <View>
            <Text style={styles.statLabel}>本月收入</Text>
            <Text style={styles.statValue}>{formatCurrency(totals.income)}</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>本月支出</Text>
            <Text style={[styles.statValue, styles.coralText]}>{formatCurrency(totals.expense)}</Text>
          </View>
        </View>
      </View>

      <SectionTitle label="分类" title="贴纸账袋" theme={theme} />
      <View style={[styles.paperPanel, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        {categoryTotals.length === 0 ? (
          <EmptyState title="暂无分类支出" desc="记录支出后，这里会自动生成贴纸账袋。" theme={theme} />
        ) : categoryTotals.map((category) => {
          const Icon = category.icon;
          const rate = category.total / Math.max(totals.expense, 1);
          return (
            <View key={category.id} style={styles.categoryRow}>
              <View style={[styles.smallSticker, { backgroundColor: category.soft }]}>
                <Icon size={17} color={category.color} />
              </View>
              <Text style={styles.categoryLabel}>{category.label}</Text>
              <View style={styles.categoryTrack}>
                <View style={[styles.categoryFill, { width: `${rate * 100}%`, backgroundColor: category.color }]} />
              </View>
              <Text style={styles.categoryAmount}>{formatCurrency(category.total).replace("CN¥", "¥")}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function AccountsScreen({ transactions, theme }: { transactions: Transaction[]; theme: ThemePalette }) {
  const accountTotals = accounts.map((account) => {
    const movement = transactions.reduce((sum, item) => {
      if (item.account !== account) return sum;
      return item.type === "income" ? sum + item.amount : sum - item.amount;
    }, 0);
    return { account, balance: movement };
  });

  return (
    <View>
      <SectionTitle label="账户" title="我的钱袋" theme={theme} />
      <View style={[styles.paperPanel, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        {accountTotals.map((item, index) => (
          <View key={item.account} style={styles.accountRow}>
            <View style={[styles.accountBadge, index % 2 === 0 ? styles.greenBadge : styles.blueBadge]}>
              <Wallet size={18} color={index % 2 === 0 ? theme.green : theme.blue} />
            </View>
            <View style={styles.accountText}>
              <Text style={styles.accountName}>{item.account}</Text>
              <Text style={styles.accountMeta}>本地账本余额</Text>
            </View>
            <Text style={styles.accountBalance}>{formatCurrency(item.balance)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SettingsScreen({
  activeThemeId,
  theme,
  user,
  onChangeTheme,
  onClearData,
  onLogout,
}: {
  activeThemeId: ThemeId;
  theme: ThemePalette;
  user: UserProfile;
  onChangeTheme: (themeId: ThemeId) => void;
  onClearData: () => void;
  onLogout: () => void;
}) {
  const items = [
    { title: "离线记账", desc: "已启用本机持久化", icon: Check },
    { title: "云同步", desc: "后端接口预留中", icon: NotebookPen },
    { title: "账本导出", desc: "后续接 CSV / Excel", icon: ReceiptText },
  ];

  return (
    <View>
      <SectionTitle label="设置" title="主题与数据" theme={theme} />
      <View style={[styles.paperPanel, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <View style={styles.panelHeader}>
          <Palette size={22} color={theme.green} />
          <Text style={styles.panelTitle}>手账主题</Text>
        </View>
        <View style={styles.themeGrid}>
          {Object.values(themePresets).map((preset) => {
            const selected = activeThemeId === preset.id;
            return (
              <Pressable
                key={preset.id}
                style={[
                  styles.themeOption,
                  { backgroundColor: preset.paper, borderColor: selected ? preset.green : preset.panelBorder },
                  selected && styles.selectedThemeOption,
                ]}
                onPress={() => onChangeTheme(preset.id)}
              >
                <View style={styles.themeSwatches}>
                  {preset.swatches.map((color) => (
                    <View key={color} style={[styles.themeSwatch, { backgroundColor: color }]} />
                  ))}
                </View>
                <View style={styles.themeTextBlock}>
                  <Text style={[styles.themeName, { color: preset.ink }]}>{preset.name}</Text>
                  <Text style={[styles.themeDesc, { color: preset.muted }]}>{preset.desc}</Text>
                </View>
                {selected ? (
                  <View style={[styles.themeCheck, { backgroundColor: preset.green }]}>
                    <Check size={14} color={preset.paper} strokeWidth={3} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <SectionTitle label="数据" title="本机设置" theme={theme} />
      <View style={[styles.paperPanel, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <View style={[styles.accountCard, { backgroundColor: theme.field }]}>
          <View style={[styles.accountAvatar, { backgroundColor: theme.ink }]}>
            <Text style={[styles.avatarInitial, { color: theme.paper }]}>{user.name.slice(0, 1)}</Text>
          </View>
          <View style={styles.accountText}>
            <Text style={[styles.accountName, { color: theme.ink }]}>{user.name}</Text>
            <Text style={[styles.accountMeta, { color: theme.muted }]}>{user.account}</Text>
          </View>
          <Pressable style={[styles.logoutButton, { borderColor: theme.panelBorder }]} onPress={onLogout}>
            <LogOut size={17} color={theme.ink} />
          </Pressable>
        </View>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <View key={item.title} style={styles.settingRow}>
              <View style={styles.smallSticker}>
                <Icon size={18} color={theme.green} />
              </View>
              <View>
                <Text style={styles.accountName}>{item.title}</Text>
                <Text style={styles.accountMeta}>{item.desc}</Text>
              </View>
            </View>
          );
        })}
        <Pressable style={[styles.clearDataButton, { backgroundColor: theme.coral }]} onPress={onClearData}>
          <Trash2 size={18} color={theme.paper} />
          <Text style={styles.clearDataText}>清除本地数据</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({
  title,
  desc,
  action,
  theme,
  onPress,
}: {
  title: string;
  desc: string;
  action?: string;
  theme: ThemePalette;
  onPress?: () => void;
}) {
  return (
    <View style={[styles.emptyState, { borderColor: theme.panelBorder }]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.paperDeep }]}>
        <NotebookPen size={22} color={theme.green} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.ink }]}>{title}</Text>
      <Text style={[styles.emptyDesc, { color: theme.muted }]}>{desc}</Text>
      {action && onPress ? (
        <Pressable style={[styles.emptyAction, { backgroundColor: theme.green }]} onPress={onPress}>
          <Plus size={16} color={theme.paper} />
          <Text style={styles.emptyActionText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TransactionRow({
  item,
  onDelete,
}: {
  item: Transaction;
  onDelete: (id: string) => void;
}) {
  const category = getCategory(item.category);
  const Icon = category.icon;
  const amount = `${item.type === "income" ? "+" : "-"}${formatCurrency(item.amount).replace("CN¥", "¥")}`;

  return (
    <View style={styles.transactionRow}>
      <View style={[styles.sticker, { backgroundColor: category.soft }]}>
        <Icon size={19} color={category.color} />
      </View>
      <View style={styles.transactionBody}>
        <Text numberOfLines={1} style={styles.transactionTitle}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.transactionMeta}>
          {category.label} · {item.account} · {item.note}
        </Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[styles.transactionAmount, item.type === "income" ? styles.greenText : styles.coralText]}>
          {amount}
        </Text>
        <Text style={styles.transactionDate}>{item.date.slice(5).replace("-", "/")}</Text>
      </View>
      <Pressable style={styles.deleteButton} onPress={() => onDelete(item.id)} accessibilityLabel={`删除${item.title}`}>
        <Trash2 size={16} color="#9b5d4d" />
      </Pressable>
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

function MetricLine({
  label,
  value,
  color,
  rate,
}: {
  label: string;
  value: string;
  color: string;
  rate: number;
}) {
  return (
    <View style={styles.metricLine}>
      <View style={styles.metricHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${rate * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function BottomTabs({
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
      <Pressable style={[styles.fab, { backgroundColor: theme.coral, borderColor: theme.ground, shadowColor: theme.coral }]} onPress={onAdd} accessibilityLabel="快速记一笔">
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
      <Text style={[styles.tabText, { color: theme.tabMuted }, selected && { color: theme.green }]}>{tab.label}</Text>
    </Pressable>
  );
}

function Composer({
  visible,
  draft,
  theme,
  onClose,
  onChange,
  onSubmit,
}: {
  visible: boolean;
  draft: Draft;
  theme: ThemePalette;
  onClose: () => void;
  onChange: (draft: Draft) => void;
  onSubmit: () => void;
}) {
  const availableCategories = draft.type === "income" ? categories.filter((item) => item.id === "income") : categories.filter((item) => item.id !== "income");

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalRoot}
      >
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
              onPress={() => onChange({ ...draft, type: "expense", category: "food" })}
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
            value={draft.amount}
            onChangeText={(amount) => onChange({ ...draft, amount })}
            keyboardType="decimal-pad"
            placeholder="¥ 0"
            placeholderTextColor="#a69b8c"
            style={[styles.amountInput, { color: theme.ink, backgroundColor: theme.field }]}
          />
          <TextInput
            value={draft.title}
            onChangeText={(title) => onChange({ ...draft, title })}
            placeholder="事项，例如晚餐、工资、房租"
            placeholderTextColor="#a69b8c"
            style={[styles.textInput, { color: theme.ink, backgroundColor: theme.field }]}
          />

          <Text style={[styles.inputLabel, { color: theme.muted }]}>分类</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPicker}>
            {availableCategories.map((category) => {
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
            {accounts.map((account) => (
              <Pressable
                key={account}
                style={[
                  styles.accountChip,
                  { backgroundColor: theme.paperDeep },
                  draft.account === account && { backgroundColor: theme.green },
                ]}
                onPress={() => onChange({ ...draft, account })}
              >
                <Text style={[styles.accountChipText, { color: draft.account === account ? theme.paper : theme.muted }]}>
                  {account}
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

          <Pressable style={[styles.submitButton, { backgroundColor: theme.coral }]} onPress={onSubmit}>
            <Check size={19} color={theme.paper} />
            <Text style={styles.submitText}>记一笔</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.ground,
  },
  app: {
    flex: 1,
    backgroundColor: palette.ground,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: palette.green,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: "#243b35",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(45, 42, 36, 0.14)",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#243b35",
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: "900",
  },
  authRoot: {
    flex: 1,
  },
  authScroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  authBrand: {
    alignItems: "center",
    marginBottom: 24,
  },
  authBadge: {
    width: 62,
    height: 62,
    marginBottom: 14,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-3deg" }],
  },
  authTitle: {
    marginTop: 2,
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 0,
  },
  authSubtitle: {
    maxWidth: 280,
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    textAlign: "center",
  },
  authCard: {
    position: "relative",
    overflow: "hidden",
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: "#372f24",
    shadowOpacity: 0.15,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  authTape: {
    position: "absolute",
    top: -9,
    alignSelf: "center",
    width: 112,
    height: 28,
    borderRadius: 5,
    opacity: 0.82,
    transform: [{ rotate: "-2deg" }],
  },
  authSwitch: {
    minHeight: 48,
    flexDirection: "row",
    gap: 6,
    padding: 4,
    marginBottom: 16,
    borderRadius: 16,
  },
  authSwitchButton: {
    flex: 1,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  authSwitchText: {
    fontSize: 14,
    fontWeight: "900",
  },
  authField: {
    marginBottom: 2,
  },
  authInput: {
    marginBottom: 10,
  },
  authSubmit: {
    minHeight: 52,
    marginTop: 6,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  authSubmitText: {
    color: palette.paper,
    fontSize: 16,
    fontWeight: "900",
  },
  authHint: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
  },
  loadingMark: {
    width: 62,
    height: 62,
    alignSelf: "center",
    marginTop: "55%",
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 112,
  },
  heroPage: {
    position: "relative",
    overflow: "hidden",
    padding: 20,
    marginTop: 6,
    marginBottom: 24,
    borderRadius: 18,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: "rgba(45, 42, 36, 0.14)",
    shadowColor: "#372f24",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  pageLines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderColor: palette.line,
  },
  tape: {
    position: "absolute",
    top: -8,
    alignSelf: "center",
    width: 110,
    height: 28,
    borderRadius: 4,
    backgroundColor: "rgba(247, 207, 114, 0.82)",
    transform: [{ rotate: "-2deg" }],
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },
  balance: {
    marginTop: 6,
    color: "#243b35",
    fontSize: 38,
    fontWeight: "900",
  },
  balanceWarn: {
    color: palette.coral,
  },
  dateSticker: {
    maxWidth: 122,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#dce9ff",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(61, 111, 182, 0.42)",
    transform: [{ rotate: "2deg" }],
  },
  dateText: {
    flexShrink: 1,
    color: "#315a8c",
    fontSize: 12,
    fontWeight: "900",
  },
  heroStats: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  statLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  statValue: {
    marginTop: 6,
    color: palette.ink,
    fontSize: 20,
    fontWeight: "900",
  },
  coralText: {
    color: palette.coral,
  },
  greenText: {
    color: palette.green,
  },
  progressBlock: {
    marginTop: 24,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressAmount: {
    color: palette.green,
    fontSize: 14,
    fontWeight: "900",
  },
  progressTrack: {
    height: 10,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#e4d6bd",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: palette.green,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
  },
  quickButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  expenseButton: {
    backgroundColor: palette.coral,
  },
  incomeButton: {
    backgroundColor: palette.green,
  },
  quickButtonText: {
    color: palette.paper,
    fontSize: 15,
    fontWeight: "900",
  },
  sectionTitle: {
    marginBottom: 12,
  },
  sectionHeading: {
    marginTop: 2,
    color: palette.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  ledgerList: {
    gap: 10,
  },
  transactionRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255, 249, 236, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(45, 42, 36, 0.1)",
  },
  sticker: {
    width: 44,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-2deg" }],
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
    backgroundColor: "#f4e7d1",
  },
  paperPanel: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 18,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: "rgba(45, 42, 36, 0.14)",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  panelTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  metricLine: {
    marginBottom: 16,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metricValue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  statPair: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    paddingTop: 4,
  },
  categoryRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  smallSticker: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d9f2ea",
  },
  categoryLabel: {
    width: 42,
    color: palette.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  categoryTrack: {
    flex: 1,
    height: 9,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#e4d6bd",
  },
  categoryFill: {
    height: "100%",
    borderRadius: 999,
  },
  categoryAmount: {
    minWidth: 60,
    textAlign: "right",
    color: palette.ink,
    fontSize: 13,
    fontWeight: "900",
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
  greenBadge: {
    backgroundColor: "#d9f2ea",
  },
  blueBadge: {
    backgroundColor: "#dce9ff",
  },
  accountText: {
    flex: 1,
  },
  accountName: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  accountMeta: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  accountBalance: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  settingRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountCard: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginBottom: 12,
    borderRadius: 16,
  },
  accountAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeOption: {
    width: "48%",
    minWidth: 136,
    minHeight: 132,
    flexGrow: 1,
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  selectedThemeOption: {
    borderWidth: 2,
  },
  themeSwatches: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
  },
  themeSwatch: {
    width: 24,
    height: 24,
    marginRight: -5,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  themeTextBlock: {
    marginTop: 12,
    paddingRight: 18,
  },
  themeName: {
    fontSize: 15,
    fontWeight: "900",
  },
  themeDesc: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  themeCheck: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  clearDataButton: {
    minHeight: 48,
    marginTop: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: palette.coral,
  },
  clearDataText: {
    color: palette.paper,
    fontSize: 14,
    fontWeight: "900",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
    borderRadius: 16,
    backgroundColor: "rgba(255, 249, 236, 0.72)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(34, 124, 112, 0.28)",
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
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: palette.green,
  },
  emptyActionText: {
    color: palette.paper,
    fontSize: 13,
    fontWeight: "900",
  },
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
    backgroundColor: "rgba(255, 249, 236, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(45, 42, 36, 0.12)",
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
    color: "#8b8376",
    fontSize: 11,
    fontWeight: "900",
  },
  selectedTabText: {
    color: palette.green,
  },
  fab: {
    width: 58,
    height: 58,
    marginTop: -28,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.coral,
    borderWidth: 4,
    borderColor: palette.ground,
    shadowColor: palette.coral,
    shadowOpacity: 0.36,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
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
    backgroundColor: palette.paper,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    marginBottom: 14,
    borderRadius: 999,
    backgroundColor: "#d6c7ae",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
    backgroundColor: "#f1e4cd",
  },
  typeSwitch: {
    flexDirection: "row",
    gap: 8,
    padding: 4,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#eee1c9",
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
  selectedType: {
    backgroundColor: "#243b35",
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
    backgroundColor: "#f7eddb",
    fontSize: 32,
    fontWeight: "900",
  },
  textInput: {
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 14,
    color: palette.ink,
    backgroundColor: "#f7eddb",
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
    backgroundColor: "#f4e7d1",
  },
  selectedAccountChip: {
    backgroundColor: "#d9f2ea",
  },
  accountChipText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "900",
  },
  selectedAccountChipText: {
    color: palette.green,
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: palette.coral,
  },
  submitText: {
    color: palette.paper,
    fontSize: 16,
    fontWeight: "900",
  },
});
