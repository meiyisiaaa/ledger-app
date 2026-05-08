import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  CircleDollarSign,
  Coffee,
  CopyPlus,
  Download,
  Filter,
  Gift,
  HeartPulse,
  Home,
  Menu,
  Palette,
  PencilLine,
  PieChart,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  ShoppingBag,
  Trash2,
  Upload,
  UserRound,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import {
  calculateBudgetSummary,
  calculateTotals,
  categoryStyleOptions as sharedCategoryStyleOptions,
  createLedgerBackup,
  createLedgerSettings,
  defaultAccounts,
  defaultCategoryDefinitions,
  defaultMonthlyBudget as sharedDefaultMonthlyBudget,
  defaultQuickTemplates,
  defaultSavingsTarget as sharedDefaultSavingsTarget,
  filterTransactions,
  formatCurrency as formatLedgerCurrency,
  getCategoryTotals,
  normalizeLedgerSettings,
  parseLedgerBackup,
  readAmountSetting,
  sortTransactions,
} from "../packages/ledger-core/src";
import type {
  CategoryDefinition,
  EntryType,
  LedgerDraft,
  LedgerSettings,
  QuickTemplate,
  SortMode,
  StoredCustomCategory,
  Transaction,
  TypeFilter,
} from "../packages/ledger-core/src";

type ThemeId = "classic" | "mint" | "blueprint" | "berry" | "graphite" | "sunrise";
type MobileActionId = "overview" | "organize" | "sort";
type BudgetCoverStyle = "ring" | "strip" | "stamp";
type BudgetAccentId = "green" | "coral" | "blue" | "gold";

type PersistedSettings = LedgerSettings & {
  themeId: ThemeId;
  budgetCoverStyle: BudgetCoverStyle;
  budgetAccentId: BudgetAccentId;
};

type Category = CategoryDefinition & { icon: LucideIcon };
type EntryDraft = LedgerDraft;

const categoryIcons: Record<string, LucideIcon> = {
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

const accounts = defaultAccounts;
const quickTemplates: QuickTemplate[] = defaultQuickTemplates;
const defaultMonthlyBudget = sharedDefaultMonthlyBudget;
const defaultSavingsTarget = sharedDefaultSavingsTarget;
const storageKey = "ledger-journal-web:v4";
const settingsStorageKey = "ledger-journal-web:settings:v2";
const resetFlagKey = "ledger-journal-web:reset-version";
const resetVersion = "clean-themes-no-demo";

const themeOptions: Array<{ id: ThemeId; label: string; desc: string; colors: string[] }> = [
  { id: "classic", label: "纸本绿", desc: "柔和纸张和深绿按钮", colors: ["#f8f3e7", "#fff9ec", "#227c70", "#d95f3d"] },
  { id: "mint", label: "薄荷本", desc: "清爽低饱和绿", colors: ["#eef8ef", "#fbfff8", "#15866d", "#df7052"] },
  { id: "blueprint", label: "蓝灰本", desc: "冷静蓝灰，适合统计", colors: ["#eef3f7", "#fbfdff", "#2f6fae", "#d46348"] },
  { id: "berry", label: "莓果本", desc: "柔粉和浆果红点缀", colors: ["#fbefef", "#fff8f6", "#c95471", "#2f7a62"] },
  { id: "graphite", label: "石墨本", desc: "深色低光，夜间更稳", colors: ["#171c1d", "#22292a", "#9bd6c7", "#e08b72"] },
  { id: "sunrise", label: "晨光本", desc: "浅金底色和蓝绿重点", colors: ["#f7f0df", "#fffdf6", "#256f7a", "#d36c4a"] },
];

const budgetCoverStyles: Array<{ id: BudgetCoverStyle; label: string }> = [
  { id: "ring", label: "圆环" },
  { id: "strip", label: "横条" },
  { id: "stamp", label: "封签" },
];

const budgetAccents: Array<{ id: BudgetAccentId; label: string; color: string; soft: string; track: string }> = [
  { id: "green", label: "松绿", color: "#227c70", soft: "#d9f2ea", track: "#e4d6bd" },
  { id: "coral", label: "珊瑚", color: "#d95f3d", soft: "#ffe1d5", track: "#ead8c3" },
  { id: "blue", label: "蓝灰", color: "#3d6fb6", soft: "#dce9ff", track: "#d8e1e7" },
  { id: "gold", label: "浅金", color: "#b38735", soft: "#f8e8bd", track: "#eadfbd" },
];

const categoryStyleOptions = sharedCategoryStyleOptions;

const weekMarkers = [
  { label: "周一", value: 280 },
  { label: "周二", value: 430 },
  { label: "周三", value: 180 },
  { label: "周四", value: 520 },
  { label: "周五", value: 350 },
  { label: "周六", value: 760 },
  { label: "周日", value: 300 },
];

function formatCurrency(value: number) {
  return formatLedgerCurrency(value);
}

function readMoneyValue(value: string, fallback: number) {
  return readAmountSetting(value, fallback);
}

function isBudgetCoverStyle(value: unknown): value is BudgetCoverStyle {
  return budgetCoverStyles.some((style) => style.id === value);
}

function isBudgetAccentId(value: unknown): value is BudgetAccentId {
  return budgetAccents.some((accent) => accent.id === value);
}

function readStoredTransactions() {
  try {
    if (window.localStorage.getItem(resetFlagKey) !== resetVersion) {
      window.localStorage.removeItem("ledger-journal-web:v3");
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem("ledger-journal-web:settings");
      window.localStorage.removeItem(settingsStorageKey);
      window.localStorage.setItem(resetFlagKey, resetVersion);
      return [];
    }
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Transaction[]) : [];
  } catch {
    return [];
  }
}

function readStoredSettings(): PersistedSettings {
  const defaults: PersistedSettings = {
    ...createLedgerSettings({}),
    themeId: "classic",
    budgetCoverStyle: "ring",
    budgetAccentId: "green",
  };

  try {
    const raw = window.localStorage.getItem(settingsStorageKey);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const settings = normalizeLedgerSettings(parsed);

    return {
      ...settings,
      themeId:
        typeof parsed.themeId === "string" && themeOptions.some((theme) => theme.id === parsed.themeId)
          ? (parsed.themeId as ThemeId)
          : "classic",
      budgetCoverStyle: isBudgetCoverStyle(parsed.budgetCoverStyle) ? parsed.budgetCoverStyle : "ring",
      budgetAccentId: isBudgetAccentId(parsed.budgetAccentId) ? parsed.budgetAccentId : "green",
    };
  } catch {
    return defaults;
  }
}

function App() {
  const storedSettings = useMemo(readStoredSettings, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainPageRef = useRef<HTMLElement>(null);
  const ledgerSectionRef = useRef<HTMLElement>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(readStoredTransactions);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [monthlyBudget, setMonthlyBudget] = useState(storedSettings.monthlyBudget);
  const [savingsTarget, setSavingsTarget] = useState(storedSettings.savingsTarget);
  const [themeId, setThemeId] = useState<ThemeId>(storedSettings.themeId);
  const [budgetCoverStyle, setBudgetCoverStyle] = useState<BudgetCoverStyle>(storedSettings.budgetCoverStyle);
  const [budgetAccentId, setBudgetAccentId] = useState<BudgetAccentId>(storedSettings.budgetAccentId);
  const [customTemplates, setCustomTemplates] = useState<QuickTemplate[]>(storedSettings.customTemplates);
  const [customCategories, setCustomCategories] = useState<StoredCustomCategory[]>(storedSettings.customCategories);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryStyleId, setNewCategoryStyleId] = useState(categoryStyleOptions[0].id);
  const [activeWeek, setActiveWeek] = useState("周四");
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMobileAction, setActiveMobileAction] = useState<MobileActionId>("overview");
  const [lastDeleted, setLastDeleted] = useState<Transaction[]>([]);
  const [toast, setToast] = useState("");
  const [draft, setDraft] = useState<EntryDraft>({
    type: "expense",
    title: "",
    category: "food",
    amount: "",
    account: accounts[0],
    note: "",
  });

  useEffect(() => {
    window.localStorage.removeItem("ledger-journal-web:v3");
    window.localStorage.removeItem("ledger-journal-web:settings");
    window.localStorage.setItem(storageKey, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    window.localStorage.setItem(
      settingsStorageKey,
      JSON.stringify(createLedgerSettings({
        monthlyBudget,
        savingsTarget,
        themeId,
        budgetCoverStyle,
        budgetAccentId,
        customTemplates,
        customCategories,
      })),
    );
  }, [budgetAccentId, budgetCoverStyle, customCategories, customTemplates, monthlyBudget, savingsTarget, themeId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 5200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const totals = useMemo(() => calculateTotals(transactions), [transactions]);

  const availableCategories = useMemo<Category[]>(() => {
    const incomeCategory = categories.find((category) => category.id === "income") ?? categories[categories.length - 1];
    const custom = customCategories.map((category) => ({
      ...category,
      icon: Wallet,
    }));
    return [...categories.filter((category) => category.id !== "income"), ...custom, incomeCategory];
  }, [customCategories]);

  const expenseCategories = useMemo(
    () => availableCategories.filter((category) => category.id !== "income"),
    [availableCategories],
  );

  const templateOptions = useMemo(() => [...quickTemplates, ...customTemplates], [customTemplates]);

  const getVisibleCategory = (categoryId: string) =>
    availableCategories.find((item) => item.id === categoryId) ?? availableCategories[0] ?? categories[0];

  const filteredTransactions = useMemo(() => {
    const visible = filterTransactions(transactions, availableCategories, {
      query,
      typeFilter,
      categoryFilter: activeCategory,
    });
    return sortTransactions(visible, sortMode);
  }, [activeCategory, availableCategories, query, sortMode, transactions, typeFilter]);

  const categoryTotals = useMemo(() => {
    return getCategoryTotals(transactions, availableCategories);
  }, [availableCategories, transactions]);

  const budgetSummary = useMemo(
    () => calculateBudgetSummary(transactions, monthlyBudget, savingsTarget),
    [monthlyBudget, savingsTarget, transactions],
  );
  const budgetUsed = budgetSummary.budgetUsedPercent;
  const netBalance = budgetSummary.netBalance;
  const savedRate = budgetSummary.savingsPercent;
  const budgetAccent = budgetAccents.find((accent) => accent.id === budgetAccentId) ?? budgetAccents[0];
  const budgetRemaining = budgetSummary.budgetRemaining;
  const daysLeftInMonth = budgetSummary.daysLeftInMonth;
  const dailySpendable = budgetSummary.dailySpendable;
  const budgetCoverVars = {
    "--progress": `${budgetUsed}%`,
    "--budget-accent": budgetAccent.color,
    "--budget-soft": budgetAccent.soft,
    "--budget-track": budgetAccent.track,
  } as CSSProperties;
  const selectedTransaction = selectedTransactionId
    ? transactions.find((item) => item.id === selectedTransactionId) ?? null
    : null;
  const alerts = useMemo(() => {
    const items = [];
    if (budgetUsed >= 90) items.push("本月预算接近上限");
    if (netBalance < 0) items.push("当前结余为负");
    if (filteredTransactions.length === 0) items.push("当前筛选没有匹配账目");
    if (items.length === 0) items.push("预算、结余和筛选状态正常");
    return items;
  }, [budgetUsed, filteredTransactions.length, netBalance]);

  function handleDraftChange<Key extends keyof EntryDraft>(key: Key, value: EntryDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(draft.amount);
    if (!draft.title.trim() || Number.isNaN(amount) || amount <= 0) return;

    const next: Transaction = {
      id: `t-${crypto.randomUUID()}`,
      type: draft.type,
      title: draft.title.trim(),
      category: draft.type === "income" ? "income" : draft.category,
      amount,
      account: draft.account,
      date: new Date().toISOString().slice(0, 10),
      note: draft.note.trim() || "随手记一笔",
    };

    setTransactions((current) => [next, ...current]);
    setDraft((current) => ({
      ...current,
      title: "",
      amount: "",
      note: "",
      category: current.type === "income" ? "food" : current.category,
    }));
  }

  function removeTransaction(id: string) {
    const target = transactions.find((item) => item.id === id);
    if (target) {
      setLastDeleted([target]);
      setToast("已删除 1 笔账目");
    }
    setTransactions((current) => current.filter((item) => item.id !== id));
    setSelectedIds((current) => current.filter((itemId) => itemId !== id));
    if (selectedTransactionId === id) setSelectedTransactionId(null);
  }

  function deleteSelectedTransactions() {
    if (selectedIds.length === 0) return;
    const deleted = transactions.filter((item) => selectedIds.includes(item.id));
    setLastDeleted(deleted);
    setToast(`已删除 ${deleted.length} 笔账目`);
    setTransactions((current) => current.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);
    setBatchMode(false);
  }

  function undoDelete() {
    if (lastDeleted.length === 0) return;
    setTransactions((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      return [...lastDeleted.filter((item) => !existingIds.has(item.id)), ...current];
    });
    setLastDeleted([]);
    setToast("");
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  }

  function useTemplate(template: QuickTemplate) {
    setDraft((current) => ({
      ...current,
      type: template.type,
      title: template.title,
      amount: template.amount,
      category: template.type === "income" ? "income" : template.category,
      account: template.account,
      note: template.note,
    }));
  }

  function saveDraftAsTemplate() {
    if (!draft.title.trim() || !draft.amount.trim()) {
      setToast("先填写事项和金额，再保存为模板");
      return;
    }
    const next: QuickTemplate = {
      id: `custom-template-${crypto.randomUUID()}`,
      custom: true,
      type: draft.type,
      title: draft.title.trim(),
      amount: draft.amount.trim(),
      category: draft.type === "income" ? "income" : draft.category,
      account: draft.account,
      note: draft.note.trim(),
    };
    setCustomTemplates((current) => [next, ...current].slice(0, 16));
    setToast("已保存为常用模板");
  }

  function removeCustomTemplate(id: string) {
    setCustomTemplates((current) => current.filter((template) => template.id !== id));
    setToast("已删除自定义模板");
  }

  function addCustomCategory() {
    const label = newCategoryLabel.trim();
    if (!label) {
      setToast("请输入分类名称");
      return;
    }
    if (availableCategories.some((category) => category.label === label)) {
      setToast("这个分类已经存在");
      return;
    }
    const style = categoryStyleOptions.find((item) => item.id === newCategoryStyleId) ?? categoryStyleOptions[0];
    const next: StoredCustomCategory = {
      id: `custom-category-${crypto.randomUUID()}`,
      label,
      color: style.color,
      soft: style.soft,
    };
    setCustomCategories((current) => [...current, next]);
    setNewCategoryLabel("");
    setDraft((current) => (current.type === "expense" ? { ...current, category: next.id } : current));
    setToast("已添加自定义分类");
  }

  function removeCustomCategory(id: string) {
    setCustomCategories((current) => current.filter((category) => category.id !== id));
    setTransactions((current) =>
      current.map((item) => (item.category === id ? { ...item, category: "daily" } : item)),
    );
    setCustomTemplates((current) =>
      current.map((template) => (template.category === id ? { ...template, category: "daily" } : template)),
    );
    if (activeCategory === id) setActiveCategory("all");
    if (draft.category === id) setDraft((current) => ({ ...current, category: "daily" }));
    setToast("已删除自定义分类，相关记录移到日用");
  }

  function repeatTransaction(item: Transaction) {
    setDraft({
      type: item.type,
      title: item.title,
      amount: `${item.amount}`,
      category: item.type === "income" ? "food" : item.category,
      account: item.account,
      note: item.note,
    });
    setSelectedTransactionId(null);
  }

  function updateTransaction(id: string, patch: Partial<Transaction>) {
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

  function scrollToSection(target: "overview" | "ledger") {
    const ref = target === "overview" ? mainPageRef : ledgerSectionRef;
    window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function focusComposer() {
    setActiveMobileAction("overview");
    setMobileMenuOpen(false);
    setNoticeOpen(false);
    setSettingsOpen(false);
    scrollToSection("overview");
  }

  function showOverview() {
    setTypeFilter("all");
    setActiveCategory("all");
    setSortMode("newest");
    setBatchMode(false);
    setSelectedIds([]);
    setSelectedTransactionId(null);
    setQuery("");
    setActiveMobileAction("overview");
    setMobileMenuOpen(false);
    setNoticeOpen(false);
    setSettingsOpen(false);
    setToast("已切到账本总览");
    scrollToSection("overview");
  }

  function organizeLedger() {
    setBatchMode(true);
    setSelectedIds([]);
    setActiveMobileAction("organize");
    setMobileMenuOpen(false);
    setNoticeOpen(false);
    setSettingsOpen(false);
    setToast(transactions.length > 0 ? "已进入整理流水，可勾选多笔删除" : "已进入整理流水，先添加或载入账目");
    scrollToSection("ledger");
  }

  function sortLedgerByAmount() {
    setSortMode("amountDesc");
    setBatchMode(false);
    setSelectedIds([]);
    setActiveMobileAction("sort");
    setMobileMenuOpen(false);
    setNoticeOpen(false);
    setSettingsOpen(false);
    setToast(transactions.length > 0 ? "已按金额从高到低排序" : "账本为空，添加后会按金额排序");
    scrollToSection("ledger");
  }

  function changeThemeFromMenu(nextThemeId: ThemeId) {
    const selectedTheme = themeOptions.find((theme) => theme.id === nextThemeId);
    setThemeId(nextThemeId);
    setToast(`已切换到${selectedTheme?.label ?? "新主题"}`);
  }

  function exportData() {
    const payload = createLedgerBackup({
      transactions,
      settings: {
        monthlyBudget,
        savingsTarget,
        themeId,
        budgetCoverStyle,
        budgetAccentId,
        customTemplates,
        customCategories,
      },
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ledger-journal-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseLedgerBackup(String(reader.result));
        setTransactions(parsed.transactions);
        if (parsed.settings) {
          setMonthlyBudget(Number(parsed.settings.monthlyBudget) || defaultMonthlyBudget);
          setSavingsTarget(Number(parsed.settings.savingsTarget) || defaultSavingsTarget);
          const importedThemeId = parsed.settings.themeId;
          const importedBudgetCoverStyle = parsed.settings.budgetCoverStyle;
          const importedBudgetAccentId = parsed.settings.budgetAccentId;
          if (typeof importedThemeId === "string" && themeOptions.some((theme) => theme.id === importedThemeId)) {
            setThemeId(importedThemeId as ThemeId);
          }
          if (isBudgetCoverStyle(importedBudgetCoverStyle)) {
            setBudgetCoverStyle(importedBudgetCoverStyle);
          }
          if (isBudgetAccentId(importedBudgetAccentId)) {
            setBudgetAccentId(importedBudgetAccentId);
          }
          setCustomTemplates(parsed.settings.customTemplates);
          setCustomCategories(parsed.settings.customCategories);
        }
        setToast("账本数据已导入");
      } catch {
        setToast("导入失败，文件格式不正确");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function resetWorkspace() {
    setTransactions([]);
    setMonthlyBudget(defaultMonthlyBudget);
    setSavingsTarget(defaultSavingsTarget);
    setThemeId("classic");
    setBudgetCoverStyle("ring");
    setBudgetAccentId("green");
    setCustomTemplates([]);
    setCustomCategories([]);
    setNewCategoryLabel("");
    setNewCategoryStyleId(categoryStyleOptions[0].id);
    setActiveCategory("all");
    setSelectedIds([]);
    setSelectedTransactionId(null);
    setToast("账本数据已清空");
  }

  return (
    <main className={`app-shell theme-${themeId}`}>
      <nav className="side-rail" aria-label="主导航">
        <button
          type="button"
          className={activeMobileAction === "overview" && !settingsOpen ? "rail-button active" : "rail-button"}
          aria-label="账本总览"
          title="账本总览"
          onClick={showOverview}
        >
          <BookOpen size={20} />
        </button>
        <button
          type="button"
          className={activeMobileAction === "organize" && !settingsOpen ? "rail-button active" : "rail-button"}
          aria-label="整理流水"
          title="整理流水"
          onClick={organizeLedger}
        >
          <ReceiptText size={20} />
        </button>
        <button
          type="button"
          className={activeMobileAction === "sort" && !settingsOpen ? "rail-button active" : "rail-button"}
          aria-label="金额排序"
          title="金额排序"
          onClick={sortLedgerByAmount}
        >
          <PieChart size={20} />
        </button>
        <button
          type="button"
          className={settingsOpen ? "rail-button active" : "rail-button"}
          aria-label="偏好设置"
          title="偏好设置"
          onClick={() => {
            setNoticeOpen(false);
            setMobileMenuOpen(false);
            setSettingsOpen((current) => !current);
          }}
        >
          <Settings2 size={20} />
        </button>
      </nav>

      <section className="journal-frame">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            aria-label="打开菜单"
            onClick={() => {
              setMobileMenuOpen(true);
              setNoticeOpen(false);
              setSettingsOpen(false);
            }}
          >
            <Menu size={20} />
          </button>
          <div>
            <p className="eyebrow">May 2026</p>
            <h1>钱去哪了</h1>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索账目"
              />
            </label>
            <div className="popover-anchor">
              <button
                className={noticeOpen ? "icon-button active-popover" : "icon-button"}
                aria-label="提醒"
                onClick={() => {
                  setNoticeOpen((current) => !current);
                  setSettingsOpen(false);
                }}
              >
                <Bell size={20} />
              </button>
              {noticeOpen ? (
                <motion.div
                  className="top-popover notice-popover"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <p className="eyebrow">提醒</p>
                  <div className="notice-list">
                    {alerts.map((alert) => (
                      <div key={alert} className="notice-item">
                        <Bell size={15} />
                        <span>{alert}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </div>
            <div className="popover-anchor">
              <button
                className="profile-button"
                aria-label="个人中心"
                onClick={() => {
                  setSettingsOpen((current) => !current);
                  setNoticeOpen(false);
                }}
              >
              <UserRound size={18} />
              <span>小林</span>
              </button>
              {settingsOpen ? (
                <motion.div
                  className="top-popover settings-popover"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <p className="eyebrow popover-title">
                    <Palette size={14} />
                    偏好
                  </p>
                  <div className="theme-list">
                    {themeOptions.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        className={themeId === theme.id ? "theme-option selected" : "theme-option"}
                        onClick={() => changeThemeFromMenu(theme.id)}
                      >
                        <span className="theme-swatches">
                          {theme.colors.map((color) => (
                            <i key={color} style={{ background: color }} />
                          ))}
                        </span>
                        <span className="theme-copy">
                          <strong>{theme.label}</strong>
                          <small>{theme.desc}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="settings-actions">
                    <button type="button" onClick={exportData}>
                      <Download size={16} />
                      导出
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={16} />
                      导入
                    </button>
                    <button type="button" onClick={resetWorkspace}>
                      <RotateCcw size={16} />
                      清空
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </div>
          </div>
        </header>

        <input
          ref={fileInputRef}
          className="hidden-file"
          type="file"
          accept="application/json"
          onChange={importData}
        />

        {mobileMenuOpen ? (
          <div className="mobile-menu-layer" role="dialog" aria-modal="true" aria-label="移动菜单">
            <button className="mobile-menu-backdrop" type="button" onClick={() => setMobileMenuOpen(false)} />
            <motion.nav
              className="mobile-menu"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="mobile-menu-head">
                <div>
                  <p className="eyebrow">菜单</p>
                  <h2>钱去哪了</h2>
                </div>
                <button className="icon-button" type="button" aria-label="关闭菜单" onClick={() => setMobileMenuOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="mobile-menu-actions">
                <button
                  type="button"
                  className={activeMobileAction === "overview" ? "selected" : ""}
                  onClick={showOverview}
                >
                  <BookOpen size={18} />
                  账本总览
                </button>
                <button
                  type="button"
                  className={activeMobileAction === "organize" ? "selected" : ""}
                  onClick={organizeLedger}
                >
                  <ReceiptText size={18} />
                  整理流水
                </button>
                <button
                  type="button"
                  className={activeMobileAction === "sort" ? "selected" : ""}
                  onClick={sortLedgerByAmount}
                >
                  <PieChart size={18} />
                  金额排序
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(true);
                    setMobileMenuOpen(false);
                  }}
                >
                  <Settings2 size={18} />
                  偏好设置
                </button>
              </div>
              <div className="mobile-theme-panel">
                <p className="mobile-menu-label">
                  <Palette size={14} />
                  主题偏好
                </p>
                <div className="mobile-theme-grid">
                  {themeOptions.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      className={themeId === theme.id ? "mobile-theme-button selected" : "mobile-theme-button"}
                      onClick={() => changeThemeFromMenu(theme.id)}
                    >
                      <span className="theme-swatches">
                        {theme.colors.map((color) => (
                          <i key={color} style={{ background: color }} />
                        ))}
                      </span>
                      <span className="theme-copy">
                        <strong>{theme.label}</strong>
                        <small>{theme.desc}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mobile-menu-tools">
                <button type="button" onClick={exportData}>
                  <Download size={16} />
                  导出数据
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} />
                  导入数据
                </button>
              </div>
            </motion.nav>
          </div>
        ) : null}

        <div className="journal-layout">
          <motion.section
            ref={mainPageRef}
            className="notebook-page main-page"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="page-stitch" aria-hidden="true" />
            <div className="section-heading">
              <div>
                <p className="eyebrow">今日速记</p>
                <h2>把新账贴进本子里</h2>
              </div>
              <span className="paper-date">
                <CalendarDays size={16} />
                5月7日 周四
              </span>
            </div>

            <section className="quick-panel" aria-label="常用模板">
              <div className="quick-group templates">
                <div className="template-head">
                  <div>
                    <span>常用模板</span>
                    <small>先选一个，再补充金额或备注</small>
                  </div>
                  <button type="button" className="text-button mini-action" onClick={saveDraftAsTemplate}>
                    <CopyPlus size={15} />
                    保存当前
                  </button>
                </div>
                <div className="chip-row template-row">
                  {templateOptions.map((template) => {
                    const category = getVisibleCategory(template.category);
                    const Icon = category.icon;
                    return (
                      <div key={template.id} className={template.custom ? "template-pill custom" : "template-pill"}>
                        <button
                          type="button"
                          className={
                            draft.title === template.title && draft.category === template.category
                              ? "template-chip selected"
                              : "template-chip"
                          }
                          onClick={() => useTemplate(template)}
                        >
                          <Icon size={15} />
                          <span>{template.title}</span>
                        </button>
                        {template.custom ? (
                          <button
                            className="template-remove"
                            type="button"
                            aria-label={`删除模板${template.title}`}
                            onClick={() => removeCustomTemplate(template.id)}
                          >
                            <X size={13} />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <form className="entry-form" onSubmit={handleSubmit}>
              <div className="segmented-control" aria-label="收支类型">
                <button
                  type="button"
                  className={draft.type === "expense" ? "selected" : ""}
                  onClick={() => handleDraftChange("type", "expense")}
                >
                  <ArrowUpRight size={16} />
                  支出
                </button>
                <button
                  type="button"
                  className={draft.type === "income" ? "selected" : ""}
                  onClick={() => handleDraftChange("type", "income")}
                >
                  <ArrowDownRight size={16} />
                  收入
                </button>
              </div>

              <label className="field title-field">
                <span>事项</span>
                <input
                  value={draft.title}
                  onChange={(event) => handleDraftChange("title", event.target.value)}
                  placeholder="例如：晚餐、房租、工资"
                />
              </label>

              <label className="field amount-field">
                <span>金额</span>
                <input
                  value={draft.amount}
                  onChange={(event) => handleDraftChange("amount", event.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                />
              </label>

              <label className="field">
                <span>分类</span>
                <select
                  value={draft.type === "income" ? "income" : draft.category}
                  disabled={draft.type === "income"}
                  onChange={(event) => handleDraftChange("category", event.target.value)}
                >
                  {(draft.type === "income" ? availableCategories.filter((category) => category.id === "income") : expenseCategories).map(
                    (category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ),
                  )}
                </select>
                <ChevronDown className="select-arrow" size={16} />
              </label>

              <label className="field">
                <span>账户</span>
                <select
                  value={draft.account}
                  onChange={(event) => handleDraftChange("account", event.target.value)}
                >
                  {accounts.map((account) => (
                    <option key={account}>{account}</option>
                  ))}
                </select>
                <ChevronDown className="select-arrow" size={16} />
              </label>

              <label className="field note-field">
                <span>备注</span>
                <input
                  value={draft.note}
                  onChange={(event) => handleDraftChange("note", event.target.value)}
                  placeholder="写下一点消费心情"
                />
              </label>

              <motion.button
                className="add-button"
                type="submit"
                whileTap={{ scale: 0.98 }}
                whileHover={{ y: -1 }}
              >
                <Plus size={18} />
                记一笔
              </motion.button>
            </form>

            <section className="custom-category-panel" aria-label="自定义分类">
              <div className="template-head">
                <div>
                  <span>自定义分类</span>
                  <small>新增后会出现在表单、筛选和详情里</small>
                </div>
              </div>
              <div className="category-builder">
                <label>
                  <span>名称</span>
                  <input
                    value={newCategoryLabel}
                    onChange={(event) => setNewCategoryLabel(event.target.value)}
                    placeholder="例如：宠物、旅行"
                  />
                </label>
                <div className="category-color-row" aria-label="分类颜色">
                  {categoryStyleOptions.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      className={newCategoryStyleId === style.id ? "selected" : ""}
                      style={{ "--category-color": style.color, "--category-soft": style.soft } as CSSProperties}
                      onClick={() => setNewCategoryStyleId(style.id)}
                    >
                      <span />
                      {style.label}
                    </button>
                  ))}
                </div>
                <button className="add-category-button" type="button" onClick={addCustomCategory}>
                  <Plus size={16} />
                  添加分类
                </button>
              </div>
              {customCategories.length > 0 ? (
                <div className="custom-category-list">
                  {customCategories.map((category) => (
                    <span
                      key={category.id}
                      className="custom-category-chip"
                      style={{ "--category-color": category.color, "--category-soft": category.soft } as CSSProperties}
                    >
                      <Wallet size={14} />
                      {category.label}
                      <button
                        type="button"
                        aria-label={`删除分类${category.label}`}
                        onClick={() => removeCustomCategory(category.id)}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="summary-strip" aria-label="本月摘要">
              <div>
                <span>本月支出</span>
                <strong>{formatCurrency(totals.expense)}</strong>
              </div>
              <div>
                <span>本月收入</span>
                <strong>{formatCurrency(totals.income)}</strong>
              </div>
              <div>
                <span>结余</span>
                <strong className={netBalance >= 0 ? "positive" : "negative"}>
                  {formatCurrency(netBalance)}
                </strong>
              </div>
            </section>

            <section className="ledger-section" ref={ledgerSectionRef}>
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">流水</p>
                  <h2>最近贴纸</h2>
                </div>
                <div className="ledger-actions">
                  {batchMode && selectedIds.length > 0 ? (
                    <button className="text-button danger" onClick={deleteSelectedTransactions}>
                      <Trash2 size={16} />
                      删除 {selectedIds.length}
                    </button>
                  ) : null}
                  <button
                    className={batchMode ? "text-button active" : "text-button"}
                    type="button"
                    onClick={() => {
                      setBatchMode((current) => !current);
                      setSelectedIds([]);
                    }}
                  >
                    <PencilLine size={16} />
                    {batchMode ? "完成" : "整理"}
                  </button>
                </div>
              </div>

              <div className="filter-board" aria-label="流水筛选">
                <div className="filter-line">
                  <div className="segmented-control compact-control" aria-label="流水类型">
                    {[
                      { id: "all", label: "全部" },
                      { id: "expense", label: "支出" },
                      { id: "income", label: "收入" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={typeFilter === item.id ? "selected" : ""}
                        onClick={() => setTypeFilter(item.id as TypeFilter)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <label className="sort-select">
                    <SlidersHorizontal size={16} />
                    <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                      <option value="newest">最新优先</option>
                      <option value="amountDesc">金额从高到低</option>
                      <option value="amountAsc">金额从低到高</option>
                    </select>
                  </label>
                </div>
                <div className="category-filter">
                  <button
                    type="button"
                    className={activeCategory === "all" ? "category-filter-chip selected" : "category-filter-chip"}
                    onClick={() => setActiveCategory("all")}
                  >
                    <Filter size={14} />
                    全部分类
                  </button>
                  {availableCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        className={
                          activeCategory === category.id ? "category-filter-chip selected" : "category-filter-chip"
                        }
                        onClick={() => setActiveCategory(category.id)}
                      >
                        <Icon size={14} />
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="transaction-list">
                {filteredTransactions.length === 0 ? (
                  <div className="empty-ledger">
                    <BookOpen size={22} />
                    <strong>账本是空的</strong>
                    <span>从上方表单记一笔，或导入自己的账本备份。</span>
                    <div className="empty-actions">
                      <button type="button" onClick={focusComposer}>
                        记一笔
                      </button>
                      <button type="button" className="secondary" onClick={() => fileInputRef.current?.click()}>
                        导入数据
                      </button>
                    </div>
                  </div>
                ) : null}
                {filteredTransactions.map((item, index) => {
                  const category = getVisibleCategory(item.category);
                  const Icon = category.icon;
                  const amountPrefix = item.type === "income" ? "+" : "-";

                  return (
                    <motion.article
                      className={selectedIds.includes(item.id) ? "transaction-row selected-row" : "transaction-row"}
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.18) }}
                    >
                      {batchMode ? (
                        <button
                          className={selectedIds.includes(item.id) ? "select-dot checked" : "select-dot"}
                          type="button"
                          aria-label={`选择${item.title}`}
                          onClick={() => toggleSelection(item.id)}
                        >
                          {selectedIds.includes(item.id) ? <Check size={13} /> : null}
                        </button>
                      ) : null}
                      <div
                        className="category-sticker"
                        style={{ "--sticker": category.soft, "--ink": category.color } as CSSProperties}
                      >
                        <Icon size={18} />
                      </div>
                      <button
                        className="transaction-main"
                        type="button"
                        onClick={() => (batchMode ? toggleSelection(item.id) : setSelectedTransactionId(item.id))}
                      >
                        <strong>{item.title}</strong>
                        <span>
                          {category.label} · {item.account} · {item.note}
                        </span>
                      </button>
                      <time>{item.date.slice(5).replace("-", "/")}</time>
                      <strong className={item.type === "income" ? "amount income" : "amount expense"}>
                        {amountPrefix}
                        {formatCurrency(item.amount).replace("CN¥", "¥")}
                      </strong>
                      <button
                        className="delete-button"
                        type="button"
                        aria-label={`删除${item.title}`}
                        onClick={() => removeTransaction(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.article>
                  );
                })}
              </div>
            </section>
          </motion.section>

          <aside className="right-stack">
            <motion.section
              className={`notebook-page budget-page budget-style-${budgetCoverStyle}`}
              style={budgetCoverVars}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            >
              <div className="tape tape-top" aria-hidden="true" />
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">预算</p>
                  <h2>钱去哪了</h2>
                </div>
                <Wallet size={22} />
              </div>

              <div className="budget-customizer" aria-label="预算封面样式">
                <div className="budget-style-tabs">
                  {budgetCoverStyles.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      className={budgetCoverStyle === style.id ? "selected" : ""}
                      onClick={() => setBudgetCoverStyle(style.id)}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
                <div className="budget-accent-row" aria-label="预算强调色">
                  {budgetAccents.map((accent) => (
                    <button
                      key={accent.id}
                      type="button"
                      className={budgetAccentId === accent.id ? "selected" : ""}
                      style={{ "--swatch": accent.color } as CSSProperties}
                      onClick={() => setBudgetAccentId(accent.id)}
                    >
                      <span />
                      {accent.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="budget-visual">
                {budgetCoverStyle === "ring" ? (
                  <div className="budget-ring">
                    <div>
                      <span>已用</span>
                      <strong>{Math.round(budgetUsed)}%</strong>
                    </div>
                  </div>
                ) : null}
                {budgetCoverStyle === "strip" ? (
                  <div className="budget-strip-visual">
                    <span>已用预算</span>
                    <strong>{Math.round(budgetUsed)}%</strong>
                    <i />
                  </div>
                ) : null}
                {budgetCoverStyle === "stamp" ? (
                  <div className="budget-stamp-visual">
                    <span>本月余额</span>
                    <strong>{formatCurrency(budgetRemaining)}</strong>
                    <small>已用 {Math.round(budgetUsed)}%</small>
                  </div>
                ) : null}
              </div>

              <div className="budget-copy">
                <strong>{formatCurrency(budgetRemaining)}</strong>
                <span>距离本月预算上限</span>
              </div>

              <div className={dailySpendable >= 0 ? "daily-budget" : "daily-budget over"}>
                <span>日均可花</span>
                <strong>{formatCurrency(Math.max(dailySpendable, 0))}</strong>
                <small>{dailySpendable >= 0 ? `按本月剩余 ${daysLeftInMonth} 天` : "本月预算已超出"}</small>
              </div>

              <label className="amount-control">
                <span>
                  月预算
                  <strong>{formatCurrency(monthlyBudget)}</strong>
                </span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={monthlyBudget}
                  onChange={(event) => setMonthlyBudget(readMoneyValue(event.target.value, monthlyBudget))}
                />
              </label>

              <div className="progress-lines">
                <div>
                  <span>储蓄目标</span>
                  <span>{Math.round(savedRate)}%</span>
                </div>
                <progress value={savedRate} max="100" />
              </div>
              <label className="amount-control compact-control-field">
                <span>
                  目标
                  <strong>{formatCurrency(savingsTarget)}</strong>
                </span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={savingsTarget}
                  onChange={(event) => setSavingsTarget(readMoneyValue(event.target.value, savingsTarget))}
                />
              </label>
            </motion.section>

            <motion.section
              className="notebook-page chart-page"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18, ease: "easeOut" }}
            >
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">趋势</p>
                  <h2>一周花费</h2>
                </div>
                <BarChart3 size={22} />
              </div>
              <div className="week-chart" aria-label="一周支出柱状图">
                {weekMarkers.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={activeWeek === item.label ? "week-bar selected" : "week-bar"}
                    onClick={() => setActiveWeek(item.label)}
                    aria-label={`${item.label}支出${item.value}元`}
                  >
                    <span style={{ height: `${Math.max((item.value / 800) * 100, 16)}%` }} />
                    <small>{item.label.slice(1)}</small>
                  </button>
                ))}
              </div>
              <div className="week-note">
                <strong>{activeWeek}</strong>
                <span>{formatCurrency(weekMarkers.find((item) => item.label === activeWeek)?.value ?? 0)} 支出</span>
              </div>
            </motion.section>

            <motion.section
              className="notebook-page category-page"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24, ease: "easeOut" }}
            >
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">分类</p>
                  <h2>贴纸账袋</h2>
                </div>
                <Coffee size={22} />
              </div>

              <div className="category-stack">
                {categoryTotals.length === 0 ? (
                  <div className="empty-mini">暂无分类支出</div>
                ) : null}
                {categoryTotals.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      className={activeCategory === item.id ? "category-line selected" : "category-line"}
                      key={item.id}
                      type="button"
                      onClick={() => setActiveCategory(activeCategory === item.id ? "all" : item.id)}
                    >
                      <div
                        className="mini-sticker"
                        style={{ "--sticker": item.soft, "--ink": item.color } as CSSProperties}
                      >
                        <Icon size={16} />
                      </div>
                      <span>{item.label}</span>
                      <div className="line-fill">
                        <i
                          style={{
                            width: `${Math.min((item.total / Math.max(totals.expense, 1)) * 100, 100)}%`,
                            background: item.color,
                          }}
                        />
                      </div>
                      <strong>{formatCurrency(item.total).replace("CN¥", "¥")}</strong>
                    </button>
                  );
                })}
              </div>
            </motion.section>
          </aside>
        </div>
      </section>

      {selectedTransaction ? (
        <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="账目详情">
          <button className="detail-backdrop" type="button" onClick={() => setSelectedTransactionId(null)} />
          <motion.aside
            className="detail-sheet"
            initial={{ opacity: 0, x: 34 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="sheet-head">
              <div>
                <p className="eyebrow">账目详情</p>
                <h2>{selectedTransaction.title}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="关闭详情" onClick={() => setSelectedTransactionId(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="detail-amount">
              <span>{getVisibleCategory(selectedTransaction.category).label}</span>
              <strong className={selectedTransaction.type === "income" ? "income" : "expense"}>
                {selectedTransaction.type === "income" ? "+" : "-"}
                {formatCurrency(selectedTransaction.amount).replace("CN¥", "¥")}
              </strong>
            </div>
            <div className="detail-editor">
              <label className="field">
                <span>事项</span>
                <input
                  value={selectedTransaction.title}
                  onChange={(event) => updateTransaction(selectedTransaction.id, { title: event.target.value })}
                />
              </label>
              <label className="field">
                <span>金额</span>
                <input
                  value={selectedTransaction.amount}
                  inputMode="decimal"
                  onChange={(event) => {
                    const nextAmount = Number(event.target.value);
                    if (!Number.isNaN(nextAmount)) {
                      updateTransaction(selectedTransaction.id, { amount: nextAmount });
                    }
                  }}
                />
              </label>
              <div className="segmented-control compact-control" aria-label="编辑收支类型">
                <button
                  type="button"
                  className={selectedTransaction.type === "expense" ? "selected" : ""}
                  onClick={() => updateTransaction(selectedTransaction.id, { type: "expense", category: "food" })}
                >
                  支出
                </button>
                <button
                  type="button"
                  className={selectedTransaction.type === "income" ? "selected" : ""}
                  onClick={() => updateTransaction(selectedTransaction.id, { type: "income", category: "income" })}
                >
                  收入
                </button>
              </div>
              <label className="field">
                <span>分类</span>
                <select
                  value={selectedTransaction.category}
                  disabled={selectedTransaction.type === "income"}
                  onChange={(event) => updateTransaction(selectedTransaction.id, { category: event.target.value })}
                >
                  {(selectedTransaction.type === "income"
                    ? availableCategories.filter((category) => category.id === "income")
                    : expenseCategories
                  ).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="select-arrow" size={16} />
              </label>
              <label className="field">
                <span>账户</span>
                <select
                  value={selectedTransaction.account}
                  onChange={(event) => updateTransaction(selectedTransaction.id, { account: event.target.value })}
                >
                  {accounts.map((account) => (
                    <option key={account}>{account}</option>
                  ))}
                </select>
                <ChevronDown className="select-arrow" size={16} />
              </label>
              <label className="field">
                <span>日期</span>
                <input
                  type="date"
                  value={selectedTransaction.date}
                  onChange={(event) => updateTransaction(selectedTransaction.id, { date: event.target.value })}
                />
              </label>
              <label className="field note-editor">
                <span>备注</span>
                <input
                  value={selectedTransaction.note}
                  onChange={(event) => updateTransaction(selectedTransaction.id, { note: event.target.value })}
                />
              </label>
            </div>
            <div className="sheet-actions">
              <button className="add-button subtle" type="button" onClick={() => repeatTransaction(selectedTransaction)}>
                <CopyPlus size={17} />
                再记一笔
              </button>
              <button className="add-button danger" type="button" onClick={() => removeTransaction(selectedTransaction.id)}>
                <Trash2 size={17} />
                删除
              </button>
            </div>
          </motion.aside>
        </div>
      ) : null}

      {toast ? (
        <motion.div
          className="toast"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          <span>{toast}</span>
          {lastDeleted.length > 0 ? (
            <button type="button" onClick={undoDelete}>
              撤销
            </button>
          ) : null}
        </motion.div>
      ) : null}
    </main>
  );
}

export default App;
