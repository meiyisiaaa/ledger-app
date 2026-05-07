import { FormEvent, useMemo, useState } from "react";
import type { CSSProperties } from "react";
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
  ChevronDown,
  CircleDollarSign,
  Coffee,
  Gift,
  HeartPulse,
  Home,
  Menu,
  PencilLine,
  PieChart,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShoppingBag,
  Trash2,
  UserRound,
  Utensils,
  Wallet,
} from "lucide-react";

type EntryType = "expense" | "income";

type Category = {
  id: string;
  label: string;
  color: string;
  soft: string;
  icon: LucideIcon;
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

type EntryDraft = {
  type: EntryType;
  title: string;
  category: string;
  amount: string;
  account: string;
  note: string;
};

const categories: Category[] = [
  { id: "food", label: "餐饮", color: "#d95f3d", soft: "#ffe1d5", icon: Utensils },
  { id: "daily", label: "日用", color: "#227c70", soft: "#d9f2ea", icon: ShoppingBag },
  { id: "traffic", label: "交通", color: "#3d6fb6", soft: "#dce9ff", icon: Car },
  { id: "home", label: "居家", color: "#8a5b2d", soft: "#f5e1c8", icon: Home },
  { id: "health", label: "健康", color: "#b84a6b", soft: "#ffdce8", icon: HeartPulse },
  { id: "gift", label: "人情", color: "#7c5bb3", soft: "#ebe1ff", icon: Gift },
  { id: "income", label: "收入", color: "#2d8a56", soft: "#dcf7e8", icon: CircleDollarSign },
];

const accounts = ["微信钱包", "支付宝", "招商储蓄卡", "现金袋"];

const seededTransactions: Transaction[] = [
  {
    id: "t-001",
    type: "expense",
    title: "午餐套餐",
    category: "food",
    amount: 38,
    account: "微信钱包",
    date: "2026-05-07",
    note: "工作日简餐",
  },
  {
    id: "t-002",
    type: "expense",
    title: "地铁通勤",
    category: "traffic",
    amount: 7,
    account: "支付宝",
    date: "2026-05-07",
    note: "早晚通勤",
  },
  {
    id: "t-003",
    type: "income",
    title: "项目尾款",
    category: "income",
    amount: 3200,
    account: "招商储蓄卡",
    date: "2026-05-06",
    note: "自由职业收入",
  },
  {
    id: "t-004",
    type: "expense",
    title: "咖啡豆补货",
    category: "daily",
    amount: 96,
    account: "微信钱包",
    date: "2026-05-06",
    note: "本月咖啡预算",
  },
  {
    id: "t-005",
    type: "expense",
    title: "体检预约",
    category: "health",
    amount: 268,
    account: "招商储蓄卡",
    date: "2026-05-05",
    note: "年度基础检查",
  },
  {
    id: "t-006",
    type: "expense",
    title: "朋友生日礼物",
    category: "gift",
    amount: 188,
    account: "支付宝",
    date: "2026-05-04",
    note: "提前准备",
  },
];

const monthlyBudget = 5200;
const savingsTarget = 3600;

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
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

function getCategory(categoryId: string) {
  return categories.find((item) => item.id === categoryId) ?? categories[0];
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(seededTransactions);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<EntryDraft>({
    type: "expense",
    title: "",
    category: "food",
    amount: "",
    account: accounts[0],
    note: "",
  });

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, item) => {
        if (item.type === "income") {
          acc.income += item.amount;
        } else {
          acc.expense += item.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return transactions;
    return transactions.filter((item) => {
      const category = getCategory(item.category).label;
      return [item.title, item.note, item.account, category].some((value) =>
        value.toLowerCase().includes(keyword),
      );
    });
  }, [query, transactions]);

  const categoryTotals = useMemo(() => {
    return categories
      .filter((category) => category.id !== "income")
      .map((category) => {
        const total = transactions
          .filter((item) => item.type === "expense" && item.category === category.id)
          .reduce((sum, item) => sum + item.amount, 0);
        return { ...category, total };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const budgetUsed = Math.min((totals.expense / monthlyBudget) * 100, 100);
  const netBalance = totals.income - totals.expense;
  const savedRate = Math.min((Math.max(netBalance, 0) / savingsTarget) * 100, 100);

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
    setTransactions((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="app-shell">
      <nav className="side-rail" aria-label="主导航">
        <button className="rail-button active" aria-label="账本">
          <BookOpen size={20} />
        </button>
        <button className="rail-button" aria-label="流水">
          <ReceiptText size={20} />
        </button>
        <button className="rail-button" aria-label="统计">
          <PieChart size={20} />
        </button>
        <button className="rail-button" aria-label="设置">
          <Settings2 size={20} />
        </button>
      </nav>

      <section className="journal-frame">
        <header className="topbar">
          <button className="icon-button mobile-only" aria-label="打开菜单">
            <Menu size={20} />
          </button>
          <div>
            <p className="eyebrow">May 2026</p>
            <h1>小账本</h1>
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
            <button className="icon-button" aria-label="提醒">
              <Bell size={20} />
            </button>
            <button className="profile-button" aria-label="个人中心">
              <UserRound size={18} />
              <span>小林</span>
            </button>
          </div>
        </header>

        <div className="journal-layout">
          <motion.section
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
                  {categories
                    .filter((category) => (draft.type === "income" ? category.id === "income" : category.id !== "income"))
                    .map((category) => (
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

            <section className="ledger-section">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">流水</p>
                  <h2>最近贴纸</h2>
                </div>
                <button className="text-button">
                  <PencilLine size={16} />
                  整理
                </button>
              </div>

              <div className="transaction-list">
                {filteredTransactions.map((item, index) => {
                  const category = getCategory(item.category);
                  const Icon = category.icon;
                  const amountPrefix = item.type === "income" ? "+" : "-";

                  return (
                    <motion.article
                      className="transaction-row"
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.18) }}
                    >
                      <div
                        className="category-sticker"
                        style={{ "--sticker": category.soft, "--ink": category.color } as CSSProperties}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="transaction-main">
                        <strong>{item.title}</strong>
                        <span>
                          {category.label} · {item.account} · {item.note}
                        </span>
                      </div>
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
              className="notebook-page budget-page"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            >
              <div className="tape tape-top" aria-hidden="true" />
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">预算</p>
                  <h2>月度封面</h2>
                </div>
                <Wallet size={22} />
              </div>

              <div className="budget-ring" style={{ "--progress": `${budgetUsed}%` } as CSSProperties}>
                <div>
                  <span>已用</span>
                  <strong>{Math.round(budgetUsed)}%</strong>
                </div>
              </div>

              <div className="budget-copy">
                <strong>{formatCurrency(monthlyBudget - totals.expense)}</strong>
                <span>距离本月预算上限</span>
              </div>

              <div className="progress-lines">
                <div>
                  <span>储蓄目标</span>
                  <span>{Math.round(savedRate)}%</span>
                </div>
                <progress value={savedRate} max="100" />
              </div>
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
                  <div key={item.label} className="week-bar">
                    <span style={{ height: `${Math.max((item.value / 800) * 100, 16)}%` }} />
                    <small>{item.label.slice(1)}</small>
                  </div>
                ))}
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
                {categoryTotals.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="category-line" key={item.id}>
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
                    </div>
                  );
                })}
              </div>
            </motion.section>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default App;
