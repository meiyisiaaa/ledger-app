import type { ComponentType } from "react";
import type { CategoryDefinition, LedgerDraft } from "../packages/ledger-core/src";

export type TabId = "today" | "stats" | "accounts" | "settings";
export type AuthMode = "login" | "register";

export type AppIcon = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export type Category = CategoryDefinition & { icon: AppIcon };
export type Draft = LedgerDraft;

export type UserProfile = {
  id: string;
  name: string;
  account: string;
  createdAt: string;
};

export type AuthDraft = {
  name: string;
  account: string;
  password: string;
};
