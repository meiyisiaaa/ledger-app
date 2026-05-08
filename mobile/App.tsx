import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
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
  Download,
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
  RefreshCw,
  Search,
  Settings2,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  Utensils,
  UserPlus,
  Wallet,
  X,
} from "lucide-react-native";
import {
  calculateBudgetSummary,
  calculateTotals,
  categoryStyleOptions as sharedCategoryStyleOptions,
  createLedgerBackup,
  defaultCategoryDefinitions,
  defaultMonthlyBudget as sharedDefaultMonthlyBudget,
  defaultQuickTemplates,
  defaultSavingsTarget as sharedDefaultSavingsTarget,
  defaultStoredAccounts,
  filterTransactions,
  findCategory as findLedgerCategory,
  formatCurrency as formatLedgerCurrency,
  getCategoryTotals,
  readAmountSetting as readLedgerAmountSetting,
} from "../packages/ledger-core/src";
import type {
  EntryType,
  QuickTemplate,
  StoredAccount,
  StoredCustomCategory,
  Transaction,
  TypeFilter,
} from "../packages/ledger-core/src";
import { BottomTabs } from "./components/BottomTabs";
import { Composer } from "./components/Composer";
import { EmptyState } from "./components/EmptyState";
import { TemplateChip } from "./components/TemplateChip";
import { TransactionRow } from "./components/TransactionRow";
import { AccountsScreen } from "./screens/AccountsScreen";
import { checkLatestRelease, type UpdateInfo } from "./services/updateService";
import {
  clearLedgerData,
  loadLedgerSnapshot,
  loginLocalUser,
  logoutLocalUser,
  registerLocalUser,
  saveLedgerSettings,
  saveTheme,
  saveTransactions,
} from "./storage/ledgerStorage";
import { defaultThemeId, isThemeId, palette, themePresets, type ThemeId, type ThemePalette } from "./theme/presets";
import type { AppIcon, AuthDraft, AuthMode, Category, Draft, TabId, UserProfile } from "./types";
import { evaluateAmountInput } from "./utils/amountInput";
import { validateBackupText } from "./utils/backupValidation";
import { CURRENT_VERSION } from "./version";

const categoryIcons: Record<string, AppIcon> = {
  food: Utensils,
  coffee: Coffee,
  grocery: ShoppingBag,
  daily: ShoppingBag,
  traffic: Car,
  home: Home,
  health: HeartPulse,
  study: BookOpen,
  fun: PieChart,
  gift: Gift,
  finance: Wallet,
  income: CircleDollarSign,
};

const categories: Category[] = defaultCategoryDefinitions.map((category) => ({
  ...category,
  icon: categoryIcons[category.id] ?? Wallet,
}));

const defaultMonthlyBudget = sharedDefaultMonthlyBudget;
const defaultSavingsTarget = sharedDefaultSavingsTarget;
const categoryStyleOptions = sharedCategoryStyleOptions;
const quickTemplates: QuickTemplate[] = defaultQuickTemplates;
type ComposerMode = "save-close" | "save-continue";

function formatCurrency(value: number) {
  return formatLedgerCurrency(value);
}

function readAmountSetting(value: unknown, fallback: number) {
  return readLedgerAmountSetting(value, fallback);
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function findCategory(source: Category[], id: string) {
  return findLedgerCategory(source, id) ?? categories[0];
}

function todayLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
}

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [themeId, setThemeId] = useState<ThemeId>(defaultThemeId);
  const [monthlyBudget, setMonthlyBudget] = useState(defaultMonthlyBudget);
  const [savingsTarget, setSavingsTarget] = useState(defaultSavingsTarget);
  const [accounts, setAccounts] = useState<StoredAccount[]>(defaultStoredAccounts);
  const [customTemplates, setCustomTemplates] = useState<QuickTemplate[]>([]);
  const [customCategories, setCustomCategories] = useState<StoredCustomCategory[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("save-close");
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Transaction[]>([]);
  const [focusCategoryId, setFocusCategoryId] = useState<string | null>(null);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [backupText, setBackupText] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<UpdateInfo | null>(null);
  const [lastUpdateCheck, setLastUpdateCheck] = useState<string | null>(null);
  const [amountFocusKey, setAmountFocusKey] = useState(0);
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
    account: defaultStoredAccounts[0].label,
    note: "",
  });
  const [lastExpenseCategory, setLastExpenseCategory] = useState("food");
  const theme = themePresets[themeId];

  useEffect(() => {
    async function restore() {
      try {
        const snapshot = await loadLedgerSnapshot();
        if (snapshot.themeId) setThemeId(snapshot.themeId);
        setMonthlyBudget(snapshot.settings.monthlyBudget);
        setSavingsTarget(snapshot.settings.savingsTarget);
        setAccounts(snapshot.settings.accounts);
        setCustomTemplates(snapshot.settings.customTemplates);
        setCustomCategories(snapshot.settings.customCategories);
        setTransactions(snapshot.transactions);
        setCurrentUser(snapshot.currentUser);
      } finally {
        setHydrated(true);
      }
    }
    restore();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveTransactions(transactions);
  }, [hydrated, transactions]);

  useEffect(() => {
    if (!hydrated) return;
    saveTheme(themeId);
  }, [hydrated, themeId]);

  useEffect(() => {
    if (!hydrated) return;
    saveLedgerSettings({ monthlyBudget, savingsTarget, accounts, customTemplates, customCategories });
  }, [accounts, customCategories, customTemplates, hydrated, monthlyBudget, savingsTarget]);

  useEffect(() => {
    if (!hydrated || !currentUser) return;
    checkForUpdates({ silent: true });
  }, [hydrated, currentUser?.id]);

  const totals = useMemo(() => calculateTotals(transactions), [transactions]);
  const budgetSummary = useMemo(
    () => calculateBudgetSummary(transactions, monthlyBudget, savingsTarget),
    [monthlyBudget, savingsTarget, transactions],
  );
  const netBalance = budgetSummary.netBalance;
  const budgetLeft = budgetSummary.budgetRemaining;
  const budgetRate = budgetSummary.budgetRate;
  const savingsRate = budgetSummary.savingsRate;
  const daysLeftInMonth = budgetSummary.daysLeftInMonth;
  const dailySpendable = budgetSummary.dailySpendable;
  const availableCategories = useMemo<Category[]>(() => {
    const incomeCategory = categories.find((category) => category.id === "income") ?? categories[categories.length - 1];
    const custom = customCategories.map((category) => ({ ...category, icon: Wallet }));
    return [...categories.filter((category) => category.id !== "income"), ...custom, incomeCategory];
  }, [customCategories]);
  const templateOptions = useMemo(() => [...quickTemplates, ...customTemplates], [customTemplates]);
  const visibleAccounts = useMemo(() => {
    const visible = accounts.filter((account) => !account.hidden);
    return visible.length > 0 ? visible : accounts.slice(0, 1);
  }, [accounts]);
  const selectedTransaction = selectedTransactionId
    ? transactions.find((item) => item.id === selectedTransactionId) ?? null
    : null;

  const categoryTotals = useMemo(() => {
    return getCategoryTotals(transactions, availableCategories);
  }, [availableCategories, transactions]);

  function switchTab(id: TabId) {
    Haptics.selectionAsync();
    setActiveTab(id);
  }

  function getExpenseCategoryFallback(categoryId: string) {
    return availableCategories.some((category) => category.id === categoryId && category.id !== "income")
      ? categoryId
      : "food";
  }

  function openComposer(type: EntryType = "expense", preset?: Partial<Draft>) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextType = preset?.type ?? type;
    const fallbackAccount = visibleAccounts[0]?.label ?? defaultStoredAccounts[0].label;
    const fallbackExpenseCategory = getExpenseCategoryFallback(lastExpenseCategory);
    setDraft((current) => ({
      ...current,
      type: nextType,
      title: preset?.title ?? "",
      amount: preset?.amount ?? "",
      category: nextType === "income"
        ? "income"
        : getExpenseCategoryFallback(
            preset?.category ?? (current.type === "expense" && current.category !== "income" ? current.category : fallbackExpenseCategory),
          ),
      account: preset?.account ?? (visibleAccounts.some((account) => account.label === current.account) ? current.account : fallbackAccount),
      note: preset?.note ?? "",
    }));
    setComposerOpen(true);
  }

  function useTemplate(template: QuickTemplate) {
    openComposer(template.type, template);
    setAmountFocusKey((current) => current + 1);
  }

  function saveDraftAsTemplate() {
    if (!draft.title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("还差一点", "先填写事项，再保存为模板。");
      return;
    }
    const templateAmount = draft.amount.trim() ? evaluateAmountInput(draft.amount) : null;
    if (draft.amount.trim() && templateAmount === null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("金额不可用", "模板金额可以留空，或填写 12+8 这类可计算金额。");
      return;
    }
    const next: QuickTemplate = {
      id: makeId("custom-template"),
      custom: true,
      type: draft.type,
      title: draft.title.trim(),
      amount: templateAmount === null ? "" : `${templateAmount}`,
      category: draft.type === "income" ? "income" : draft.category,
      account: draft.account,
      note: draft.note.trim(),
    };
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCustomTemplates((current) => [next, ...current].slice(0, 18));
    Alert.alert("已保存", "这个事项已加入常用模板。");
  }

  function removeCustomTemplate(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCustomTemplates((current) => current.filter((template) => template.id !== id));
  }

  function addCustomCategory(label: string, styleId: string) {
    const name = label.trim();
    if (!name) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("还差一点", "请输入分类名称。");
      return;
    }
    if (availableCategories.some((category) => category.label === name)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("分类已存在", "换一个名称，或直接使用已有分类。");
      return;
    }
    const style = categoryStyleOptions.find((option) => option.id === styleId) ?? categoryStyleOptions[0];
    const next: StoredCustomCategory = {
      id: makeId("custom-category"),
      label: name,
      color: style.color,
      soft: style.soft,
    };
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCustomCategories((current) => [...current, next]);
    setLastExpenseCategory(next.id);
    setDraft((current) => (current.type === "expense" ? { ...current, category: next.id } : current));
  }

  function removeCustomCategory(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLastExpenseCategory((current) => (current === id ? "daily" : current));
    setCustomCategories((current) => current.filter((category) => category.id !== id));
    setTransactions((current) =>
      current.map((item) => (item.category === id ? { ...item, category: "daily" } : item)),
    );
    setCustomTemplates((current) =>
      current.map((template) => (template.category === id ? { ...template, category: "daily" } : template)),
    );
    setDraft((current) => (current.category === id ? { ...current, category: "daily" } : current));
  }

  function addAccount(label: string) {
    const name = label.trim();
    if (!name) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("还差一点", "请输入账户名称。");
      return;
    }
    if (accounts.some((account) => account.label === name)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("账户已存在", "换一个名称，或直接使用已有账户。");
      return;
    }

    const next: StoredAccount = { id: makeId("account"), label: name, hidden: false };
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAccounts((current) => [...current, next]);
    setDraft((current) => ({ ...current, account: current.account || name }));
  }

  function renameAccount(id: string, label: string) {
    const name = label.trim();
    const target = accounts.find((account) => account.id === id);
    if (!target || target.label === name) return;
    if (!name) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("账户名称为空", "请输入可用的账户名称。");
      return;
    }
    if (accounts.some((account) => account.id !== id && account.label === name)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("账户已存在", "换一个名称，或直接使用已有账户。");
      return;
    }

    const previous = target.label;
    Haptics.selectionAsync();
    setAccounts((current) => current.map((account) => (account.id === id ? { ...account, label: name } : account)));
    setTransactions((current) => current.map((item) => (item.account === previous ? { ...item, account: name } : item)));
    setCustomTemplates((current) =>
      current.map((template) => (template.account === previous ? { ...template, account: name } : template)),
    );
    setDraft((current) => (current.account === previous ? { ...current, account: name } : current));
  }

  function hideAccount(id: string, hidden: boolean) {
    const target = accounts.find((account) => account.id === id);
    if (!target) return;
    if (hidden && accounts.filter((account) => !account.hidden && account.id !== id).length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("至少保留一个账户", "记账时需要至少一个可选账户。");
      return;
    }

    Haptics.selectionAsync();
    setAccounts((current) => current.map((account) => (account.id === id ? { ...account, hidden } : account)));
    if (hidden && draft.account === target.label) {
      const fallback = accounts.find((account) => account.id !== id && !account.hidden)?.label ?? defaultStoredAccounts[0].label;
      setDraft((current) => ({ ...current, account: fallback }));
    }
  }

  function deleteAccount(id: string) {
    const target = accounts.find((account) => account.id === id);
    if (!target) return;
    if (accounts.length <= 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("至少保留一个账户", "记账时需要至少一个账户。");
      return;
    }

    const inUse =
      transactions.some((item) => item.account === target.label) ||
      templateOptions.some((template) => template.account === target.label);

    if (inUse) {
      Alert.alert("账户已有记录", `「${target.label}」已经被流水或模板使用，不能直接删除。可以先隐藏它。`, [
        { text: "取消", style: "cancel" },
        { text: "隐藏账户", onPress: () => hideAccount(id, true) },
      ]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAccounts((current) => current.filter((account) => account.id !== id));
    if (draft.account === target.label) {
      const fallback = accounts.find((account) => account.id !== id && !account.hidden)?.label ?? defaultStoredAccounts[0].label;
      setDraft((current) => ({ ...current, account: fallback }));
    }
  }

  function showNotice() {
    const notes = [
      budgetRate >= 0.9 ? "本月预算接近上限。" : "预算状态正常。",
      netBalance < 0 ? "当前结余为负，建议先检查大额支出。" : `本月结余 ${formatCurrency(netBalance)}。`,
      dailySpendable >= 0
        ? `按剩余 ${daysLeftInMonth} 天，日均可花 ${formatCurrency(dailySpendable)}。`
        : "本月预算已超出。",
    ];
    Haptics.selectionAsync();
    Alert.alert("今日提醒", notes.join("\n"));
  }

  function submitDraft(mode: ComposerMode = "save-close") {
    if (composerMode !== mode) setComposerMode(mode);
    const amount = evaluateAmountInput(draft.amount);
    if (!draft.title.trim() || amount === null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("还差一点", "请填写事项和正确的金额。金额可以写成 12+8 或 100-20。");
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
    const nextExpenseCategory = next.type === "expense" ? next.category : getExpenseCategoryFallback(lastExpenseCategory);
    if (next.type === "expense") setLastExpenseCategory(next.category);
    setTransactions((current) => [next, ...current]);
    setDraft({
      type: "expense",
      title: "",
      amount: "",
      category: nextExpenseCategory,
      account: draft.account,
      note: "",
    });
    if (mode === "save-continue") {
      setComposerOpen(true);
      setAmountFocusKey((current) => current + 1);
    } else {
      setComposerOpen(false);
    }
    setActiveTab("today");
  }

  function deleteEntry(id: string) {
    const target = transactions.find((item) => item.id === id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (target) setLastDeleted([target]);
    setTransactions((current) => current.filter((item) => item.id !== id));
    if (selectedTransactionId === id) setSelectedTransactionId(null);
  }

  function undoDelete() {
    if (lastDeleted.length === 0) return;
    Haptics.selectionAsync();
    setTransactions((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      return [...lastDeleted.filter((item) => !existingIds.has(item.id)), ...current];
    });
    setLastDeleted([]);
  }

  function updateEntry(id: string, patch: Partial<Transaction>) {
    setTransactions((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const nextType = patch.type ?? item.type;
        return {
          ...item,
          ...patch,
          category: nextType === "income" ? "income" : patch.category ?? item.category,
        };
      }),
    );
  }

  function repeatEntry(item: Transaction) {
    setSelectedTransactionId(null);
    openComposer(item.type, {
      type: item.type,
      title: item.title,
      amount: `${item.amount}`,
      category: item.type === "income" ? "income" : item.category,
      account: item.account,
      note: item.note,
    });
    setAmountFocusKey((current) => current + 1);
  }

  function openCategoryLedger(categoryId: string) {
    Haptics.selectionAsync();
    setFocusCategoryId(categoryId);
    setActiveTab("today");
  }

  async function clearLocalData() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("清除本机账目", "只会清除这台设备上的账目和旧演示缓存，不会删除本机账号、主题、分类、模板和账户设置。清除前建议先导出备份。", [
      { text: "取消", style: "cancel" },
      {
        text: "清除",
        style: "destructive",
        onPress: async () => {
          await clearLedgerData();
          setTransactions([]);
          setSelectedTransactionId(null);
          setLastDeleted([]);
          Alert.alert("已清除", "本机账目和旧演示缓存已经清空，账号与设置仍保留。");
        },
      },
    ]);
  }

  async function shareBackupPayload() {
    const payload = createLedgerBackup({
      appVersion: CURRENT_VERSION,
      transactions,
      settings: {
        themeId,
        monthlyBudget,
        savingsTarget,
        accounts,
        customTemplates,
        customCategories,
      },
    });
    await Share.share({
      title: "钱去哪了账本备份",
      message: JSON.stringify(payload, null, 2),
    });
  }

  async function exportBackup() {
    Alert.alert("导出本机备份", "备份 JSON 是恢复本机账本的主要方式。请保存到自己能找到的位置，不会自动同步到云端。", [
      { text: "取消", style: "cancel" },
      { text: "导出", onPress: () => shareBackupPayload() },
    ]);
  }

  function openBackupImport() {
    setBackupText("");
    setBackupModalOpen(true);
  }

  function importBackupFromText(value: string) {
    const validation = validateBackupText(value);
    if (validation.status !== "ok") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("导入失败", validation.message);
      return;
    }

    try {
      const parsed = validation.parsed;
      const settings = parsed.settings;
      setTransactions(parsed.transactions);
      setSelectedTransactionId(null);
      setLastDeleted([]);
      if (settings) {
        setMonthlyBudget(readAmountSetting(settings.monthlyBudget, defaultMonthlyBudget));
        setSavingsTarget(readAmountSetting(settings.savingsTarget, defaultSavingsTarget));
        setAccounts(settings.accounts);
        setCustomTemplates(settings.customTemplates);
        setCustomCategories(settings.customCategories);
        const importedThemeId = settings.themeId;
        if (typeof importedThemeId === "string" && isThemeId(importedThemeId)) {
          setThemeId(importedThemeId);
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBackupModalOpen(false);
      setBackupText("");
      const legacyNote = validation.isLegacy ? " 已自动兼容旧版备份。" : "";
      Alert.alert(
        "已导入",
        `恢复 ${validation.summary.transactions} 笔账目、${validation.summary.templates} 个模板、${validation.summary.categories} 个分类、${validation.summary.accounts} 个账户。${legacyNote}`,
      );
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("导入失败", error instanceof SyntaxError ? "JSON 格式不正确，请检查是否完整粘贴。" : "请粘贴完整的 JSON 备份内容。");
    }
  }

  function changeTheme(nextThemeId: ThemeId) {
    Haptics.selectionAsync();
    setThemeId(nextThemeId);
  }

  function changeMonthlyBudget(value: string) {
    setMonthlyBudget(readAmountSetting(value, monthlyBudget));
  }

  function changeSavingsTarget(value: string) {
    setSavingsTarget(readAmountSetting(value, savingsTarget));
  }

  function resetBudgetSettings() {
    Haptics.selectionAsync();
    setMonthlyBudget(defaultMonthlyBudget);
    setSavingsTarget(defaultSavingsTarget);
  }

  async function openUpdate(update: UpdateInfo) {
    const targetUrl = update.apkUrl || update.pageUrl;
    const canOpen = await Linking.canOpenURL(targetUrl);
    if (!canOpen) {
      Alert.alert("无法打开下载链接", "请稍后到 GitHub Release 页面手动下载 APK。");
      return;
    }
    await Linking.openURL(targetUrl);
  }

  function promptUpdate(update: UpdateInfo) {
    Alert.alert(
      "发现新版本",
      `当前版本 ${CURRENT_VERSION}，最新版本 ${update.version}。是否下载 APK 安装包？`,
      [
        { text: "稍后", style: "cancel" },
        { text: "下载 APK", onPress: () => openUpdate(update) },
      ],
    );
  }

  async function checkForUpdates(options: { silent?: boolean } = {}) {
    if (checkingUpdate) return;
    setCheckingUpdate(true);

    try {
      const update = await checkLatestRelease(CURRENT_VERSION);
      setLastUpdateCheck(new Date().toLocaleString("zh-CN", { hour12: false }));

      if (!update) {
        setLatestUpdate(null);
        if (!options.silent) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("已是最新版", `当前版本 ${CURRENT_VERSION} 已经是最新，或最新 Release 暂无 APK。`);
        }
        return;
      }

      setLatestUpdate(update);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      promptUpdate(update);
    } catch {
      if (!options.silent) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("检查失败", "无法连接 GitHub Release，请确认网络后再试。");
      }
    } finally {
      setCheckingUpdate(false);
    }
  }

  async function handleRegister() {
    const result = await registerLocalUser(authDraft);
    if (!result.ok && result.reason === "invalid") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("注册信息不完整", "请填写昵称、手机号或邮箱，并设置至少 6 位密码。");
      return;
    }

    if (!result.ok && result.reason === "exists") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("账号已存在", "请直接登录，或换一个手机号/邮箱。");
      return;
    }
    if (!result.ok) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCurrentUser(result.profile);
    setAuthDraft({ name: "", account: "", password: "" });
  }

  async function handleLogin() {
    const result = await loginLocalUser(authDraft);
    if (!result.ok && result.reason === "invalid") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("登录信息不完整", "请填写手机号/邮箱和密码。");
      return;
    }

    if (!result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("登录失败", "账号或密码不正确。");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCurrentUser(result.profile);
    setAuthDraft({ name: "", account: "", password: "" });
  }

  async function logout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await logoutLocalUser();
    setCurrentUser(null);
    setComposerOpen(false);
    setActiveTab("today");
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={themeId === "graphite" ? "light" : "dark"} backgroundColor={theme.ground} />
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
          <Header
            theme={theme}
            user={currentUser}
            onNoticePress={showNotice}
            onProfilePress={() => switchTab("settings")}
          />

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
                dailySpendable={dailySpendable}
                daysLeftInMonth={daysLeftInMonth}
                templates={templateOptions}
                categories={availableCategories}
                focusCategoryId={focusCategoryId}
                theme={theme}
                onOpenComposer={openComposer}
                onOpenBackupImport={openBackupImport}
                onUseTemplate={useTemplate}
                onRemoveTemplate={removeCustomTemplate}
                onOpenEntry={setSelectedTransactionId}
                onDelete={deleteEntry}
                onRepeatEntry={repeatEntry}
                onCategoryFocusHandled={() => setFocusCategoryId(null)}
              />
            )}
            {activeTab === "stats" && (
              <StatsScreen
                totals={totals}
                categoryTotals={categoryTotals}
                savingsRate={savingsRate}
                budgetRate={budgetRate}
                theme={theme}
                onSelectCategory={openCategoryLedger}
              />
            )}
            {activeTab === "accounts" && (
              <AccountsScreen
                accounts={accounts}
                transactions={transactions}
                templates={templateOptions}
                theme={theme}
                onAddAccount={addAccount}
                onRenameAccount={renameAccount}
                onHideAccount={hideAccount}
                onDeleteAccount={deleteAccount}
              />
            )}
            {activeTab === "settings" && (
              <SettingsScreen
                activeThemeId={themeId}
                theme={theme}
                user={currentUser}
                monthlyBudget={monthlyBudget}
                savingsTarget={savingsTarget}
                customCategories={customCategories}
                onChangeTheme={changeTheme}
                onChangeMonthlyBudget={changeMonthlyBudget}
                onChangeSavingsTarget={changeSavingsTarget}
                onResetBudgetSettings={resetBudgetSettings}
                onAddCustomCategory={addCustomCategory}
                onRemoveCustomCategory={removeCustomCategory}
                onExportBackup={exportBackup}
                onOpenBackupImport={openBackupImport}
                onClearData={clearLocalData}
                checkingUpdate={checkingUpdate}
                latestUpdate={latestUpdate}
                lastUpdateCheck={lastUpdateCheck}
                onCheckUpdates={() => checkForUpdates()}
                onLogout={logout}
              />
            )}
          </ScrollView>

          <BottomTabs activeTab={activeTab} theme={theme} onChange={switchTab} onAdd={() => openComposer("expense")} />
          <Composer
            visible={composerOpen}
            draft={draft}
            theme={theme}
            categories={availableCategories}
            accounts={accounts}
            expenseCategoryFallback={getExpenseCategoryFallback(lastExpenseCategory)}
            focusAmountKey={amountFocusKey}
            onClose={() => setComposerOpen(false)}
            onChange={setDraft}
            onSubmit={submitDraft}
            onSaveTemplate={saveDraftAsTemplate}
          />
          <EntryDetail
            transaction={selectedTransaction}
            theme={theme}
            categories={availableCategories}
            accounts={accounts}
            onClose={() => setSelectedTransactionId(null)}
            onUpdate={updateEntry}
            onDelete={deleteEntry}
            onRepeat={repeatEntry}
          />
          <BackupImportModal
            visible={backupModalOpen}
            value={backupText}
            theme={theme}
            onChange={setBackupText}
            onClose={() => setBackupModalOpen(false)}
            onImport={() => importBackupFromText(backupText)}
          />
          {lastDeleted.length > 0 ? (
            <UndoToast count={lastDeleted.length} theme={theme} onUndo={undoDelete} onClose={() => setLastDeleted([])} />
          ) : null}
        </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Header({
  theme,
  user,
  onNoticePress,
  onProfilePress,
}: {
  theme: ThemePalette;
  user: UserProfile;
  onNoticePress: () => void;
  onProfilePress: () => void;
}) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={[styles.eyebrow, { color: theme.green }]}>May 2026</Text>
        <Text style={[styles.title, { color: theme.ink }]}>钱去哪了</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          style={[styles.iconButton, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}
          accessibilityLabel="今日提醒"
          onPress={onNoticePress}
        >
          <Bell size={20} color={theme.ink} />
        </Pressable>
        <Pressable
          style={[styles.avatar, { backgroundColor: theme.ink }]}
          accessibilityLabel="打开个人设置"
          onPress={onProfilePress}
        >
          <Text style={[styles.avatarInitial, { color: theme.paper }]}>{user.name.slice(0, 1)}</Text>
        </Pressable>
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
          <Text style={[styles.authTitle, { color: theme.ink }]}>钱去哪了</Text>
          <Text style={[styles.authSubtitle, { color: theme.muted }]}>本机保存，不会自动同步；请定期导出备份，换手机前先恢复 JSON。</Text>
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
            当前账号只用于这台设备登录，不代表云同步。卸载 App 或清除应用数据前请先导出备份。
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
  dailySpendable,
  daysLeftInMonth,
  templates,
  categories: availableCategories,
  focusCategoryId,
  theme,
  onOpenComposer,
  onOpenBackupImport,
  onUseTemplate,
  onRemoveTemplate,
  onOpenEntry,
  onDelete,
  onRepeatEntry,
  onCategoryFocusHandled,
}: {
  transactions: Transaction[];
  totals: { income: number; expense: number };
  netBalance: number;
  budgetLeft: number;
  budgetRate: number;
  dailySpendable: number;
  daysLeftInMonth: number;
  templates: QuickTemplate[];
  categories: Category[];
  focusCategoryId: string | null;
  theme: ThemePalette;
  onOpenComposer: (type?: EntryType) => void;
  onOpenBackupImport: () => void;
  onUseTemplate: (template: QuickTemplate) => void;
  onRemoveTemplate: (id: string) => void;
  onOpenEntry: (id: string) => void;
  onDelete: (id: string) => void;
  onRepeatEntry: (item: Transaction) => void;
  onCategoryFocusHandled: () => void;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredTransactions = useMemo(() => {
    return filterTransactions(transactions, availableCategories, {
      query,
      typeFilter,
      categoryFilter,
    });
  }, [availableCategories, categoryFilter, query, transactions, typeFilter]);

  const filterCategories =
    typeFilter === "income"
      ? availableCategories.filter((category) => category.id === "income")
      : availableCategories.filter((category) => category.id !== "income");
  const hasActiveFilters = Boolean(query.trim()) || typeFilter !== "all" || categoryFilter !== "all";

  function clearFilters() {
    setQuery("");
    setTypeFilter("all");
    setCategoryFilter("all");
  }

  useEffect(() => {
    if (!focusCategoryId) return;
    setQuery("");
    setTypeFilter("expense");
    setCategoryFilter(focusCategoryId);
    onCategoryFocusHandled();
  }, [focusCategoryId, onCategoryFocusHandled]);

  return (
    <View>
      <View style={[styles.heroPage, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <View style={[styles.pageLines, { borderColor: theme.line }]} pointerEvents="none" />
        <View style={[styles.tape, { backgroundColor: theme.yellow }]} />
        <View style={styles.heroTop}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.green }]}>本月结余</Text>
            <Text style={[styles.balance, { color: netBalance < 0 ? theme.coral : theme.ink }]}>
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
            <Text style={[styles.statLabel, { color: theme.muted }]}>收入</Text>
            <Text style={[styles.statValue, { color: theme.ink }]}>{formatCurrency(totals.income)}</Text>
          </View>
          <View>
            <Text style={[styles.statLabel, { color: theme.muted }]}>支出</Text>
            <Text style={[styles.statValue, styles.coralText]}>{formatCurrency(totals.expense)}</Text>
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={[styles.statLabel, { color: theme.muted }]}>月预算剩余</Text>
            <Text style={[styles.progressAmount, { color: theme.green }]}>{formatCurrency(budgetLeft)}</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.paperDeep }]}>
            <View style={[styles.progressFill, { width: `${budgetRate * 100}%`, backgroundColor: theme.green }]} />
          </View>
        </View>

        <View
          style={[
            styles.dailySpendable,
            { backgroundColor: theme.field, borderColor: theme.panelBorder },
            dailySpendable < 0 && { backgroundColor: "#ffe1d5" },
          ]}
        >
          <View>
            <Text style={[styles.statLabel, { color: theme.muted }]}>日均可花</Text>
            <Text style={[styles.dailySpendableMeta, { color: theme.muted }]}>
              {dailySpendable >= 0 ? `按剩余 ${daysLeftInMonth} 天` : "本月预算已超出"}
            </Text>
          </View>
          <Text style={[styles.dailySpendableAmount, { color: dailySpendable >= 0 ? theme.green : theme.coral }]}>
            {formatCurrency(Math.max(dailySpendable, 0))}
          </Text>
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

      <View style={styles.templateBlock}>
        <View style={styles.templateHeader}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.green }]}>模板</Text>
            <Text style={[styles.templateTitle, { color: theme.ink }]}>常用一触即填</Text>
          </View>
          <Text style={[styles.templateHint, { color: theme.muted }]}>打开后可直接改金额</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateScroller}>
          {templates.map((template) => (
            <TemplateChip
              key={template.id}
              template={template}
              theme={theme}
              categories={availableCategories}
              onPress={() => onUseTemplate(template)}
              onRemove={template.custom ? () => onRemoveTemplate(template.id) : undefined}
            />
          ))}
        </ScrollView>
      </View>

      <SectionTitle label="流水" title="最近贴纸" theme={theme} />
      <View style={[styles.ledgerTools, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <View style={[styles.mobileSearchBox, { backgroundColor: theme.field }]}>
          <Search size={17} color={theme.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="搜索事项、备注、账户"
            placeholderTextColor="#a69b8c"
            style={[styles.mobileSearchInput, { color: theme.ink }]}
          />
        </View>
        <View style={styles.filterTabs}>
          {[
            { id: "all", label: "全部" },
            { id: "expense", label: "支出" },
            { id: "income", label: "收入" },
          ].map((item) => {
            const selected = typeFilter === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.filterTab, { backgroundColor: selected ? theme.ink : theme.paperDeep }]}
                onPress={() => {
                  setTypeFilter(item.id as TypeFilter);
                  setCategoryFilter("all");
                }}
              >
                <Text style={[styles.filterTabText, { color: selected ? theme.paper : theme.muted }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilterScroller}>
          <Pressable
            style={[
              styles.categoryFilterChip,
              { backgroundColor: categoryFilter === "all" ? theme.ink : theme.paperDeep },
            ]}
            onPress={() => setCategoryFilter("all")}
          >
            <SlidersHorizontal size={15} color={categoryFilter === "all" ? theme.paper : theme.muted} />
            <Text style={[styles.categoryFilterText, { color: categoryFilter === "all" ? theme.paper : theme.muted }]}>全部分类</Text>
          </Pressable>
          {filterCategories.map((category) => {
            const selected = categoryFilter === category.id;
            const Icon = category.icon;
            return (
              <Pressable
                key={category.id}
                style={[
                  styles.categoryFilterChip,
                  { backgroundColor: selected ? category.soft : theme.paperDeep, borderColor: selected ? category.color : "transparent" },
                ]}
                onPress={() => setCategoryFilter(category.id)}
              >
                <Icon size={15} color={selected ? category.color : theme.muted} />
                <Text style={[styles.categoryFilterText, { color: selected ? category.color : theme.muted }]}>{category.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {hasActiveFilters ? (
          <Pressable
            style={[styles.clearFilterButton, { borderColor: theme.panelBorder, backgroundColor: theme.paperDeep }]}
            onPress={clearFilters}
          >
            <X size={15} color={theme.ink} />
            <Text style={[styles.clearFilterText, { color: theme.ink }]}>清除筛选</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.ledgerList}>
        {transactions.length === 0 ? (
          <EmptyState
            title="还没有账目"
            desc="数据只保存在本机，不会自动同步。可以先记一笔，或导入已有备份。"
            action="记一笔"
            secondaryAction="导入备份"
            theme={theme}
            onPress={() => onOpenComposer("expense")}
            onSecondaryPress={onOpenBackupImport}
          />
        ) : filteredTransactions.length === 0 ? (
          <EmptyState
            title="没有匹配账目"
            desc="换一个关键词或分类筛选，再继续整理流水。"
            action="清除筛选"
            theme={theme}
            onPress={clearFilters}
          />
        ) : (
          filteredTransactions.map((item) => (
            <TransactionRow
              key={item.id}
              item={item}
              theme={theme}
              categories={availableCategories}
              onOpen={() => onOpenEntry(item.id)}
              onDelete={onDelete}
              onRepeat={onRepeatEntry}
            />
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
  onSelectCategory,
}: {
  totals: { income: number; expense: number };
  categoryTotals: Array<Category & { total: number }>;
  savingsRate: number;
  budgetRate: number;
  theme: ThemePalette;
  onSelectCategory: (categoryId: string) => void;
}) {
  return (
    <View>
      <SectionTitle label="统计" title="月度复盘" theme={theme} />
      <View style={[styles.paperPanel, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <View style={styles.panelHeader}>
          <BarChart3 size={22} color={theme.green} />
          <Text style={[styles.panelTitle, { color: theme.ink }]}>预算和储蓄</Text>
        </View>
        <MetricLine label="预算使用" value={`${Math.round(budgetRate * 100)}%`} color={theme.coral} rate={budgetRate} theme={theme} />
        <MetricLine label="储蓄目标" value={`${Math.round(savingsRate * 100)}%`} color={theme.blue} rate={savingsRate} theme={theme} />
        <View style={styles.statPair}>
          <View>
            <Text style={[styles.statLabel, { color: theme.muted }]}>本月收入</Text>
            <Text style={[styles.statValue, { color: theme.ink }]}>{formatCurrency(totals.income)}</Text>
          </View>
          <View>
            <Text style={[styles.statLabel, { color: theme.muted }]}>本月支出</Text>
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
            <Pressable
              key={category.id}
              style={styles.categoryRow}
              onPress={() => onSelectCategory(category.id)}
              accessibilityLabel={`查看${category.label}流水`}
            >
              <View style={[styles.smallSticker, { backgroundColor: category.soft }]}>
                <Icon size={17} color={category.color} />
              </View>
              <Text style={[styles.categoryLabel, { color: theme.ink }]}>{category.label}</Text>
              <View style={styles.categoryTrack}>
                <View style={[styles.categoryFill, { width: `${rate * 100}%`, backgroundColor: category.color }]} />
              </View>
              <Text style={[styles.categoryAmount, { color: theme.ink }]}>{formatCurrency(category.total).replace("CN¥", "¥")}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SettingsScreen({
  activeThemeId,
  theme,
  user,
  monthlyBudget,
  savingsTarget,
  customCategories,
  onChangeTheme,
  onChangeMonthlyBudget,
  onChangeSavingsTarget,
  onResetBudgetSettings,
  onAddCustomCategory,
  onRemoveCustomCategory,
  onExportBackup,
  onOpenBackupImport,
  onClearData,
  checkingUpdate,
  latestUpdate,
  lastUpdateCheck,
  onCheckUpdates,
  onLogout,
}: {
  activeThemeId: ThemeId;
  theme: ThemePalette;
  user: UserProfile;
  monthlyBudget: number;
  savingsTarget: number;
  customCategories: StoredCustomCategory[];
  onChangeTheme: (themeId: ThemeId) => void;
  onChangeMonthlyBudget: (value: string) => void;
  onChangeSavingsTarget: (value: string) => void;
  onResetBudgetSettings: () => void;
  onAddCustomCategory: (label: string, styleId: string) => void;
  onRemoveCustomCategory: (id: string) => void;
  onExportBackup: () => void;
  onOpenBackupImport: () => void;
  onClearData: () => void;
  checkingUpdate: boolean;
  latestUpdate: UpdateInfo | null;
  lastUpdateCheck: string | null;
  onCheckUpdates: () => void;
  onLogout: () => void;
}) {
  const [categoryLabel, setCategoryLabel] = useState("");
  const [categoryStyleId, setCategoryStyleId] = useState(categoryStyleOptions[0].id);
  const items = [
    { title: "本机保存", desc: "流水、模板和设置只保存在这台设备", icon: Check },
    { title: "不会自动同步", desc: "换手机或卸载前请先导出 JSON 备份", icon: LockKeyhole },
    { title: "本机备份", desc: "可导出或粘贴 JSON 恢复", icon: ReceiptText },
  ];
  const updateDesc = latestUpdate
    ? `发现 ${latestUpdate.version}，可下载 APK`
    : lastUpdateCheck
      ? `当前 ${CURRENT_VERSION}，上次检查 ${lastUpdateCheck}`
      : `当前 ${CURRENT_VERSION}，启动后会自动检查`;

  return (
    <View>
      <SectionTitle label="设置" title="主题与数据" theme={theme} />
      <View style={[styles.paperPanel, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <View style={styles.panelHeader}>
          <Palette size={22} color={theme.green} />
          <Text style={[styles.panelTitle, { color: theme.ink }]}>手账主题</Text>
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

      <SectionTitle label="预算" title="金额偏好" theme={theme} />
      <View style={[styles.paperPanel, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <View style={styles.panelHeader}>
          <Wallet size={22} color={theme.green} />
          <Text style={[styles.panelTitle, { color: theme.ink }]}>月度目标</Text>
        </View>
        <View style={styles.settingAmountGrid}>
          <View style={styles.settingAmountField}>
            <Text style={[styles.inputLabel, { color: theme.muted }]}>月预算</Text>
            <TextInput
              value={`${monthlyBudget}`}
              onChangeText={onChangeMonthlyBudget}
              keyboardType="number-pad"
              placeholder="5200"
              placeholderTextColor="#a69b8c"
              style={[styles.textInput, styles.settingAmountInput, { color: theme.ink, backgroundColor: theme.field }]}
            />
          </View>
          <View style={styles.settingAmountField}>
            <Text style={[styles.inputLabel, { color: theme.muted }]}>储蓄目标</Text>
            <TextInput
              value={`${savingsTarget}`}
              onChangeText={onChangeSavingsTarget}
              keyboardType="number-pad"
              placeholder="3600"
              placeholderTextColor="#a69b8c"
              style={[styles.textInput, styles.settingAmountInput, { color: theme.ink, backgroundColor: theme.field }]}
            />
          </View>
        </View>
        <Pressable
          style={[styles.resetBudgetButton, { borderColor: theme.panelBorder, backgroundColor: theme.paperDeep }]}
          onPress={onResetBudgetSettings}
        >
          <RefreshCw size={16} color={theme.ink} />
          <Text style={[styles.resetBudgetText, { color: theme.ink }]}>恢复默认预算</Text>
        </Pressable>
      </View>

      <SectionTitle label="分类" title="自定义分类" theme={theme} />
      <View style={[styles.paperPanel, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <View style={styles.panelHeader}>
          <SlidersHorizontal size={22} color={theme.green} />
          <Text style={[styles.panelTitle, { color: theme.ink }]}>分类偏好</Text>
        </View>
        <TextInput
          value={categoryLabel}
          onChangeText={setCategoryLabel}
          placeholder="例如：宠物、旅行"
          placeholderTextColor="#a69b8c"
          style={[styles.textInput, { color: theme.ink, backgroundColor: theme.field }]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryStyleScroller}>
          {categoryStyleOptions.map((option) => {
            const selected = categoryStyleId === option.id;
            return (
              <Pressable
                key={option.id}
                style={[
                  styles.categoryStyleButton,
                  {
                    backgroundColor: selected ? option.soft : theme.paperDeep,
                    borderColor: selected ? option.color : "transparent",
                  },
                ]}
                onPress={() => setCategoryStyleId(option.id)}
              >
                <View style={[styles.categoryStyleDot, { backgroundColor: option.color }]} />
                <Text style={[styles.categoryStyleText, { color: selected ? option.color : theme.muted }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          style={[styles.addCategoryButton, { backgroundColor: theme.green }]}
          onPress={() => {
            onAddCustomCategory(categoryLabel, categoryStyleId);
            setCategoryLabel("");
          }}
        >
          <Plus size={17} color={theme.paper} />
          <Text style={styles.addCategoryText}>添加分类</Text>
        </Pressable>
        {customCategories.length > 0 ? (
          <View style={styles.customCategoryList}>
            {customCategories.map((category) => (
              <View
                key={category.id}
                style={[styles.customCategoryPill, { backgroundColor: category.soft, borderColor: category.color }]}
              >
                <Wallet size={15} color={category.color} />
                <Text style={[styles.customCategoryText, { color: category.color }]}>{category.label}</Text>
                <Pressable
                  style={styles.customCategoryRemove}
                  onPress={() => onRemoveCustomCategory(category.id)}
                  accessibilityLabel={`删除分类${category.label}`}
                >
                  <X size={13} color={category.color} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.categoryEmptyText, { color: theme.muted }]}>暂无自定义分类。</Text>
        )}
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
                <Text style={[styles.accountName, { color: theme.ink }]}>{item.title}</Text>
                <Text style={[styles.accountMeta, { color: theme.muted }]}>{item.desc}</Text>
              </View>
            </View>
          );
        })}
        <View style={styles.dataActionGrid}>
          <Pressable style={[styles.dataActionButton, { backgroundColor: theme.green }]} onPress={onExportBackup}>
            <Download size={17} color={theme.paper} />
            <Text style={styles.dataActionText}>导出备份</Text>
          </Pressable>
          <Pressable style={[styles.dataActionButton, { backgroundColor: theme.blue }]} onPress={onOpenBackupImport}>
            <ReceiptText size={17} color={theme.paper} />
            <Text style={styles.dataActionText}>导入备份</Text>
          </Pressable>
        </View>
        <Pressable style={[styles.clearDataButton, { backgroundColor: theme.coral }]} onPress={onClearData}>
          <Trash2 size={18} color={theme.paper} />
          <Text style={styles.clearDataText}>清除本地数据</Text>
        </Pressable>
      </View>

      <SectionTitle label="更新" title="发行版安装包" theme={theme} />
      <View style={[styles.paperPanel, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <View style={styles.settingRow}>
          <View style={styles.smallSticker}>
            <Download size={18} color={latestUpdate ? theme.coral : theme.green} />
          </View>
          <View style={styles.updateTextBlock}>
            <Text style={[styles.accountName, { color: theme.ink }]}>{latestUpdate ? "有新版本可用" : "自动检测更新"}</Text>
            <Text style={[styles.accountMeta, { color: theme.muted }]}>{updateDesc}</Text>
          </View>
        </View>
        <Pressable
          style={[styles.checkUpdateButton, { backgroundColor: checkingUpdate ? theme.paperDeep : theme.green }]}
          onPress={onCheckUpdates}
          disabled={checkingUpdate}
          accessibilityLabel="检查更新"
        >
          <RefreshCw size={18} color={checkingUpdate ? theme.muted : theme.paper} />
          <Text style={[styles.checkUpdateText, checkingUpdate && { color: theme.muted }]}>
            {checkingUpdate ? "正在检查..." : latestUpdate ? "重新检查 / 下载" : "检查更新"}
          </Text>
        </Pressable>
      </View>

      <SectionTitle label="关于" title="钱去哪了" theme={theme} />
      <View style={[styles.paperPanel, { backgroundColor: theme.paper, borderColor: theme.panelBorder }]}>
        <View style={styles.settingRow}>
          <View style={styles.smallSticker}>
            <NotebookPen size={18} color={theme.green} />
          </View>
          <View style={styles.updateTextBlock}>
            <Text style={[styles.accountName, { color: theme.ink }]}>当前版本 {CURRENT_VERSION}</Text>
            <Text style={[styles.accountMeta, { color: theme.muted }]}>面向少量熟人安装使用的本机记账 APK。</Text>
          </View>
        </View>
        <View style={styles.settingRow}>
          <View style={styles.smallSticker}>
            <LockKeyhole size={18} color={theme.green} />
          </View>
          <View style={styles.updateTextBlock}>
            <Text style={[styles.accountName, { color: theme.ink }]}>数据只在本机</Text>
            <Text style={[styles.accountMeta, { color: theme.muted }]}>不会自动同步到云端；备份 JSON 是迁移和恢复的主要方式。</Text>
          </View>
        </View>
        <Pressable
          style={[styles.checkUpdateButton, { backgroundColor: checkingUpdate ? theme.paperDeep : theme.blue }]}
          onPress={onCheckUpdates}
          disabled={checkingUpdate}
        >
          <Download size={18} color={checkingUpdate ? theme.muted : theme.paper} />
          <Text style={[styles.checkUpdateText, checkingUpdate && { color: theme.muted }]}>
            {checkingUpdate ? "正在检查..." : "检查 GitHub Release"}
          </Text>
        </Pressable>
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

function MetricLine({
  label,
  value,
  color,
  rate,
  theme,
}: {
  label: string;
  value: string;
  color: string;
  rate: number;
  theme: ThemePalette;
}) {
  return (
    <View style={styles.metricLine}>
      <View style={styles.metricHeader}>
        <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
        <Text style={[styles.metricValue, { color: theme.ink }]}>{value}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.paperDeep }]}>
        <View style={[styles.progressFill, { width: `${rate * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function EntryDetail({
  transaction,
  theme,
  categories: availableCategories,
  accounts,
  onClose,
  onUpdate,
  onDelete,
  onRepeat,
}: {
  transaction: Transaction | null;
  theme: ThemePalette;
  categories: Category[];
  accounts: StoredAccount[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
  onRepeat: (item: Transaction) => void;
}) {
  if (!transaction) return null;

  const current = transaction;
  const category = findCategory(availableCategories, current.category);
  const detailCategories = current.type === "income"
    ? availableCategories.filter((item) => item.id === "income")
    : availableCategories.filter((item) => item.id !== "income");
  const detailAccounts = accounts.filter((account) => !account.hidden || account.label === transaction.account);

  function confirmDelete() {
    Alert.alert("删除账目", `确认删除「${current.title}」吗？`, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: () => onDelete(current.id) },
    ]);
  }

  function updateAmount(value: string) {
    if (!value.trim()) return;
    const nextAmount = Number(value.replace(",", "."));
    if (Number.isFinite(nextAmount) && nextAmount > 0) {
      onUpdate(current.id, { amount: nextAmount });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("金额不可用", "账目金额必须是大于 0 的数字。");
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalRoot}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.detailSheet, { backgroundColor: theme.paper }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.paperDeep }]} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.eyebrow, { color: theme.green }]}>账目详情</Text>
              <Text style={[styles.sheetTitle, { color: theme.ink }]}>{transaction.title}</Text>
            </View>
            <Pressable style={[styles.closeButton, { backgroundColor: theme.paperDeep }]} onPress={onClose} accessibilityLabel="关闭详情">
              <X size={20} color={theme.ink} />
            </Pressable>
          </View>

          <View style={[styles.detailAmountPanel, { backgroundColor: theme.field, borderColor: theme.panelBorder }]}>
            <View style={[styles.templateIcon, { backgroundColor: category.soft }]}>
              <category.icon size={18} color={category.color} />
            </View>
            <View style={styles.detailAmountCopy}>
              <Text style={[styles.accountMeta, { color: theme.muted }]}>{category.label}</Text>
              <Text style={[styles.detailAmountText, { color: transaction.type === "income" ? theme.green : theme.coral }]}>
                {transaction.type === "income" ? "+" : "-"}
                {formatCurrency(transaction.amount).replace("CN¥", "¥")}
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailEditor}>
            <Text style={[styles.inputLabel, { color: theme.muted }]}>事项</Text>
            <TextInput
              value={transaction.title}
              onChangeText={(title) => onUpdate(transaction.id, { title })}
              placeholder="事项"
              placeholderTextColor="#a69b8c"
              style={[styles.textInput, { color: theme.ink, backgroundColor: theme.field }]}
            />

            <Text style={[styles.inputLabel, { color: theme.muted }]}>金额</Text>
            <TextInput
              value={`${transaction.amount}`}
              onChangeText={updateAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#a69b8c"
              style={[styles.textInput, { color: theme.ink, backgroundColor: theme.field }]}
            />

            <View style={[styles.typeSwitch, { backgroundColor: theme.paperDeep }]}>
              <Pressable
                style={[styles.typeButton, transaction.type === "expense" && { backgroundColor: theme.ink }]}
                onPress={() =>
                  onUpdate(transaction.id, {
                    type: "expense",
                    category: transaction.category === "income" ? "food" : transaction.category,
                  })
                }
              >
                <ArrowUpRight size={17} color={transaction.type === "expense" ? theme.paper : theme.muted} />
                <Text style={[styles.typeText, transaction.type === "expense" && styles.selectedTypeText]}>支出</Text>
              </Pressable>
              <Pressable
                style={[styles.typeButton, transaction.type === "income" && { backgroundColor: theme.ink }]}
                onPress={() => onUpdate(transaction.id, { type: "income", category: "income" })}
              >
                <ArrowDownRight size={17} color={transaction.type === "income" ? theme.paper : theme.muted} />
                <Text style={[styles.typeText, transaction.type === "income" && styles.selectedTypeText]}>收入</Text>
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: theme.muted }]}>分类</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPicker}>
              {detailCategories.map((item) => {
                const Icon = item.icon;
                const selected = transaction.category === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.categoryChip, selected && { borderColor: item.color, backgroundColor: item.soft }]}
                    onPress={() => onUpdate(transaction.id, { category: item.id })}
                  >
                    <Icon size={17} color={item.color} />
                    <Text style={styles.categoryChipText}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: theme.muted }]}>账户</Text>
            <View style={styles.accountPicker}>
              {detailAccounts.map((account) => (
                <Pressable
                  key={account.id}
                  style={[
                    styles.accountChip,
                    { backgroundColor: theme.paperDeep },
                    transaction.account === account.label && { backgroundColor: theme.green },
                  ]}
                  onPress={() => onUpdate(transaction.id, { account: account.label })}
                >
                  <Text style={[styles.accountChipText, { color: transaction.account === account.label ? theme.paper : theme.muted }]}>
                    {account.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.muted }]}>日期</Text>
            <TextInput
              value={transaction.date}
              onChangeText={(date) => onUpdate(transaction.id, { date })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#a69b8c"
              style={[styles.textInput, { color: theme.ink, backgroundColor: theme.field }]}
            />

            <Text style={[styles.inputLabel, { color: theme.muted }]}>备注</Text>
            <TextInput
              value={transaction.note}
              onChangeText={(note) => onUpdate(transaction.id, { note })}
              placeholder="备注"
              placeholderTextColor="#a69b8c"
              style={[styles.textInput, { color: theme.ink, backgroundColor: theme.field }]}
            />
          </ScrollView>

          <View style={styles.detailActions}>
            <Pressable style={[styles.detailActionButton, { backgroundColor: theme.green }]} onPress={onClose}>
              <Check size={17} color={theme.paper} />
              <Text style={styles.detailActionText}>完成</Text>
            </Pressable>
            <Pressable style={[styles.detailActionButton, { backgroundColor: theme.blue }]} onPress={() => onRepeat(transaction)}>
              <NotebookPen size={17} color={theme.paper} />
              <Text style={styles.detailActionText}>复制</Text>
            </Pressable>
            <Pressable style={[styles.detailActionButton, { backgroundColor: theme.coral }]} onPress={confirmDelete}>
              <Trash2 size={17} color={theme.paper} />
              <Text style={styles.detailActionText}>删除</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function BackupImportModal({
  visible,
  value,
  theme,
  onChange,
  onClose,
  onImport,
}: {
  visible: boolean;
  value: string;
  theme: ThemePalette;
  onChange: (value: string) => void;
  onClose: () => void;
  onImport: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalRoot}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.backupSheet, { backgroundColor: theme.paper }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.paperDeep }]} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.eyebrow, { color: theme.green }]}>导入备份</Text>
              <Text style={[styles.sheetTitle, { color: theme.ink }]}>粘贴 JSON 内容</Text>
            </View>
            <Pressable style={[styles.closeButton, { backgroundColor: theme.paperDeep }]} onPress={onClose} accessibilityLabel="关闭导入">
              <X size={20} color={theme.ink} />
            </Pressable>
          </View>
          <TextInput
            value={value}
            onChangeText={onChange}
            multiline
            textAlignVertical="top"
            placeholder="把导出的 JSON 备份完整粘贴到这里"
            placeholderTextColor="#a69b8c"
            style={[styles.backupInput, { color: theme.ink, backgroundColor: theme.field, borderColor: theme.panelBorder }]}
          />
          <View style={styles.detailActions}>
            <Pressable style={[styles.detailActionButton, { backgroundColor: theme.paperDeep }]} onPress={onClose}>
              <X size={17} color={theme.ink} />
              <Text style={[styles.resetBudgetText, { color: theme.ink }]}>取消</Text>
            </Pressable>
            <Pressable style={[styles.detailActionButton, { backgroundColor: theme.green }]} onPress={onImport}>
              <Check size={17} color={theme.paper} />
              <Text style={styles.detailActionText}>恢复备份</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function UndoToast({
  count,
  theme,
  onUndo,
  onClose,
}: {
  count: number;
  theme: ThemePalette;
  onUndo: () => void;
  onClose: () => void;
}) {
  return (
    <View style={[styles.undoToast, { backgroundColor: theme.ink }]}>
      <Text style={[styles.undoText, { color: theme.paper }]}>已删除 {count} 笔账目</Text>
      <Pressable style={[styles.undoButton, { backgroundColor: theme.yellow }]} onPress={onUndo}>
        <Text style={[styles.undoButtonText, { color: palette.ink }]}>撤销</Text>
      </Pressable>
      <Pressable style={styles.undoClose} onPress={onClose} accessibilityLabel="关闭撤销提示">
        <X size={14} color={theme.paper} />
      </Pressable>
    </View>
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
  dailySpendable: {
    minHeight: 62,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  dailySpendableMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  dailySpendableAmount: {
    flexShrink: 0,
    fontSize: 22,
    fontWeight: "900",
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
  templateBlock: {
    marginBottom: 24,
  },
  templateHeader: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  templateTitle: {
    marginTop: 2,
    fontSize: 19,
    fontWeight: "900",
  },
  templateHint: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "800",
  },
  templateScroller: {
    gap: 10,
    paddingRight: 18,
  },
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
  ledgerTools: {
    gap: 10,
    padding: 12,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  mobileSearchBox: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  mobileSearchInput: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    fontSize: 14,
    fontWeight: "800",
  },
  filterTabs: {
    minHeight: 42,
    flexDirection: "row",
    gap: 8,
  },
  filterTab: {
    flex: 1,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "900",
  },
  categoryFilterScroller: {
    gap: 8,
    paddingRight: 18,
  },
  categoryFilterChip: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 13,
    borderWidth: 1,
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: "900",
  },
  clearFilterButton: {
    minHeight: 40,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: "900",
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
  updateTextBlock: {
    flex: 1,
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
  settingAmountGrid: {
    flexDirection: "row",
    gap: 12,
  },
  settingAmountField: {
    flex: 1,
  },
  settingAmountInput: {
    minHeight: 46,
    marginBottom: 0,
  },
  resetBudgetButton: {
    minHeight: 44,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  resetBudgetText: {
    fontSize: 13,
    fontWeight: "900",
  },
  categoryStyleScroller: {
    gap: 8,
    paddingBottom: 12,
  },
  categoryStyleButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    borderRadius: 13,
    borderWidth: 1,
  },
  categoryStyleDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  categoryStyleText: {
    fontSize: 12,
    fontWeight: "900",
  },
  addCategoryButton: {
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addCategoryText: {
    color: palette.paper,
    fontSize: 14,
    fontWeight: "900",
  },
  customCategoryList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  customCategoryPill: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 10,
    paddingRight: 5,
    borderRadius: 13,
    borderWidth: 1,
  },
  customCategoryText: {
    fontSize: 13,
    fontWeight: "900",
  },
  customCategoryRemove: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.42)",
  },
  categoryEmptyText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
  },
  dataActionGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  dataActionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dataActionText: {
    color: palette.paper,
    fontSize: 13,
    fontWeight: "900",
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
  checkUpdateButton: {
    minHeight: 48,
    marginTop: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  checkUpdateText: {
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
  detailSheet: {
    maxHeight: "94%",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: palette.paper,
  },
  backupSheet: {
    maxHeight: "86%",
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
  detailAmountPanel: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  detailAmountCopy: {
    flex: 1,
    minWidth: 0,
  },
  detailAmountText: {
    marginTop: 3,
    fontSize: 24,
    fontWeight: "900",
  },
  detailEditor: {
    paddingBottom: 8,
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
    backgroundColor: "#f7eddb",
    fontSize: 15,
    fontWeight: "800",
  },
  backupInput: {
    minHeight: 220,
    padding: 12,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    color: palette.ink,
    backgroundColor: "#f7eddb",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
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
  detailActions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 8,
  },
  detailActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  detailActionText: {
    color: palette.paper,
    fontSize: 14,
    fontWeight: "900",
  },
  undoToast: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 92,
    minHeight: 50,
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#372f24",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 9,
  },
  undoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
  },
  undoButton: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  undoButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  undoClose: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
