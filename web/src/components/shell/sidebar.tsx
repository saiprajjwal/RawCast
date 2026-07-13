"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Clapperboard, ChevronsUpDown, PanelLeftClose, PanelLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_MAIN, NAV_SECONDARY, type NavItem } from "@/components/shell/nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium text-sidebar-foreground/85 transition-all duration-200 hover:translate-x-1",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
        active && "bg-sidebar-accent text-sidebar-accent-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <item.icon className="size-[17px] shrink-0 opacity-80 group-hover:opacity-100" strokeWidth={1.8} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.goKey && (
        <kbd className="ml-auto hidden rounded border border-border/70 bg-background px-1 font-mono text-[10px] text-muted-foreground/70 group-hover:inline-block">
          g{item.goKey}
        </kbd>
      )}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 232 }}
      initial={false}
      transition={{ type: "spring", stiffness: 400, damping: 38 }}
      className="relative z-30 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 glass md:flex"
    >
      {/* Workspace switcher */}
      <div className={cn("flex items-center gap-2 p-3", collapsed && "justify-center px-2")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-sidebar-accent",
                collapsed && "flex-none justify-center",
              )}
              aria-label="Switch workspace"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground shadow-sm shadow-brand/30 elevation-1 transition-all duration-300 group-hover:shadow-md group-hover:shadow-brand/40 group-hover:scale-105">
                <Clapperboard className="size-4" strokeWidth={2} />
              </span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold leading-tight">
                      RawCast Studio
                    </span>
                    <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                      Pro workspace
                    </span>
                  </span>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2.5">
              <span className="grid size-6 place-items-center rounded-md bg-brand text-brand-foreground">
                <Clapperboard className="size-3.5" />
              </span>
              RawCast Studio
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2.5 text-muted-foreground">
              <Plus className="size-4" /> New workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main nav */}
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3 scrollbar-thin">
        {NAV_MAIN.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={pathname.startsWith(item.href)}
          />
        ))}
        <div className="my-3 h-px bg-sidebar-border" role="separator" />
        {NAV_SECONDARY.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      {/* Collapse control */}
      <div className={cn("border-t border-sidebar-border p-3", collapsed && "px-2")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "w-full justify-start gap-2.5 text-muted-foreground",
                collapsed && "justify-center",
              )}
            >
              {collapsed ? (
                <PanelLeft className="size-4" />
              ) : (
                <>
                  <PanelLeftClose className="size-4" />
                  <span className="text-[13px]">Collapse</span>
                  <kbd className="ml-auto rounded border border-border/70 bg-background px-1 font-mono text-[10px] text-muted-foreground/70">
                    [
                  </kbd>
                </>
              )}
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" sideOffset={8}>
              Expand sidebar <kbd className="ml-1 font-mono text-[10px]">[</kbd>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </motion.aside>
  );
}
