import {
  LayoutDashboard,
  CalendarDays,
  PenSquare,
  ListOrdered,
  BarChart3,
  Image,
  Sparkles,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** `g` + key jumps to the page */
  goKey?: string;
}

export const NAV_MAIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, goKey: "d" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, goKey: "c" },
  { href: "/composer", label: "Composer", icon: PenSquare, goKey: "n" },
  { href: "/queue", label: "Queue", icon: ListOrdered, goKey: "q" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, goKey: "a" },
  { href: "/library", label: "Media Library", icon: Image, goKey: "l" },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles, goKey: "i" },
];

export const NAV_SECONDARY: NavItem[] = [
  { href: "/team", label: "Team", icon: Users, goKey: "t" },
  { href: "/settings", label: "Settings", icon: Settings, goKey: "s" },
];
