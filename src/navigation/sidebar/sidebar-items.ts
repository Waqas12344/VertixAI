import {
  BotMessageSquare,
  CreditCard,
  type LucideIcon,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Workspace",
    items: [
      {
        id: "overview",
        title: "Overview",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        id: "ai-chatbot",
        title: "AI Chatbot",
        url: "/chat",
        icon: BotMessageSquare,
      },
      {
        id: "image-studio",
        title: "Image Studio",
        url: "/image-generator",
        icon: Sparkles,
        badge: "new",
      },
      {
        id: "billing",
        title: "Billing & Credits",
        url: "/billing",
        icon: CreditCard,
      },
    ],
  },
];
