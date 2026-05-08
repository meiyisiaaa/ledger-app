export const palette = {
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

export type ThemeId = "classic" | "mint" | "berry" | "blueprint" | "graphite" | "sunrise";

export type ThemePalette = typeof palette & {
  id: ThemeId;
  name: string;
  desc: string;
  field: string;
  tabMuted: string;
  panelBorder: string;
  swatches: string[];
};

export const themePresets: Record<ThemeId, ThemePalette> = {
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
  graphite: {
    ...palette,
    id: "graphite",
    name: "石墨本",
    desc: "深色低光，夜间更稳",
    ink: "#edf4f1",
    muted: "#a7b5af",
    paper: "#22292a",
    paperDeep: "#303a3a",
    ground: "#171c1d",
    green: "#9bd6c7",
    coral: "#e08b72",
    blue: "#8eb4dc",
    yellow: "#d3b56a",
    line: "rgba(155, 214, 199, 0.13)",
    field: "#303a3a",
    tabMuted: "#8d9b96",
    panelBorder: "rgba(155, 214, 199, 0.14)",
    swatches: ["#171c1d", "#22292a", "#9bd6c7", "#e08b72"],
  },
  sunrise: {
    ...palette,
    id: "sunrise",
    name: "晨光本",
    desc: "浅金底色和蓝绿重点",
    ink: "#2b2a22",
    muted: "#706d5e",
    paper: "#fffdf6",
    paperDeep: "#eadfbd",
    ground: "#f7f0df",
    green: "#256f7a",
    coral: "#d36c4a",
    blue: "#3f70a5",
    yellow: "#f2d27c",
    line: "rgba(37, 111, 122, 0.12)",
    field: "#f5ecd3",
    tabMuted: "#7d7865",
    panelBorder: "rgba(37, 111, 122, 0.15)",
    swatches: ["#f7f0df", "#fffdf6", "#256f7a", "#d36c4a"],
  },
};

export const defaultThemeId: ThemeId = "classic";

export function isThemeId(value: string | null): value is ThemeId {
  return Boolean(value && value in themePresets);
}
