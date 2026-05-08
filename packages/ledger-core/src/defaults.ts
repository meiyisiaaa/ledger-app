import type { CategoryDefinition, QuickTemplate, StoredAccount } from "./types";

export const currentLedgerSchemaVersion = 3;
export const ledgerBackupVersion = currentLedgerSchemaVersion;
export const defaultMonthlyBudget = 5200;
export const defaultSavingsTarget = 3600;
export const defaultAccounts = ["微信钱包", "支付宝", "储蓄卡", "现金袋"];
export const defaultStoredAccounts: StoredAccount[] = defaultAccounts.map((label, index) => ({
  id: `default-account-${index + 1}`,
  label,
  hidden: false,
}));

export const defaultCategoryDefinitions: CategoryDefinition[] = [
  { id: "food", label: "餐饮", color: "#d95f3d", soft: "#ffe1d5" },
  { id: "coffee", label: "咖啡", color: "#8a5b2d", soft: "#f5e1c8" },
  { id: "grocery", label: "买菜", color: "#2d8a56", soft: "#dcf7e8" },
  { id: "daily", label: "日用", color: "#227c70", soft: "#d9f2ea" },
  { id: "traffic", label: "交通", color: "#3d6fb6", soft: "#dce9ff" },
  { id: "home", label: "居家", color: "#8a5b2d", soft: "#f5e1c8" },
  { id: "health", label: "健康", color: "#b84a6b", soft: "#ffdce8" },
  { id: "study", label: "学习", color: "#3d6fb6", soft: "#dce9ff" },
  { id: "fun", label: "娱乐", color: "#7c5bb3", soft: "#ebe1ff" },
  { id: "gift", label: "人情", color: "#7c5bb3", soft: "#ebe1ff" },
  { id: "finance", label: "理财", color: "#227c70", soft: "#d9f2ea" },
  { id: "income", label: "收入", color: "#2d8a56", soft: "#dcf7e8" },
];

export const categoryStyleOptions = [
  { id: "green", label: "松绿", color: "#227c70", soft: "#d9f2ea" },
  { id: "coral", label: "珊瑚", color: "#d95f3d", soft: "#ffe1d5" },
  { id: "blue", label: "蓝灰", color: "#3d6fb6", soft: "#dce9ff" },
  { id: "berry", label: "莓果", color: "#b84a6b", soft: "#ffdce8" },
  { id: "gold", label: "浅金", color: "#b38735", soft: "#f8e8bd" },
];

export const defaultQuickTemplates: QuickTemplate[] = [
  { id: "tpl-breakfast", type: "expense", title: "早餐", amount: "18", category: "food", account: "微信钱包", note: "早晨补给" },
  { id: "tpl-lunch", type: "expense", title: "午餐", amount: "38", category: "food", account: "微信钱包", note: "工作日简餐" },
  { id: "tpl-commute", type: "expense", title: "通勤", amount: "7", category: "traffic", account: "支付宝", note: "地铁公交" },
  { id: "tpl-coffee", type: "expense", title: "咖啡", amount: "32", category: "coffee", account: "微信钱包", note: "下午提神" },
  { id: "tpl-grocery", type: "expense", title: "买菜", amount: "68", category: "grocery", account: "微信钱包", note: "今晚食材" },
  { id: "tpl-daily", type: "expense", title: "日用品", amount: "49", category: "daily", account: "支付宝", note: "生活消耗" },
  { id: "tpl-home", type: "expense", title: "家庭采购", amount: "128", category: "home", account: "储蓄卡", note: "家庭补货" },
  { id: "tpl-utilities", type: "expense", title: "水电燃气", amount: "180", category: "home", account: "储蓄卡", note: "固定支出" },
  { id: "tpl-medicine", type: "expense", title: "药品", amount: "45", category: "health", account: "支付宝", note: "健康备用" },
  { id: "tpl-movie", type: "expense", title: "电影", amount: "58", category: "fun", account: "微信钱包", note: "周末放松" },
  { id: "tpl-course", type: "expense", title: "课程", amount: "199", category: "study", account: "储蓄卡", note: "学习提升" },
  { id: "tpl-gift", type: "expense", title: "礼物", amount: "188", category: "gift", account: "支付宝", note: "人情往来" },
  { id: "tpl-income", type: "income", title: "工资", amount: "", category: "income", account: "储蓄卡", note: "本月收入" },
];
