"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Search,
  SunMedium,
  Moon,
  Bell,
  PanelRight,
  PenSquare,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationsPopover } from "@/components/shell/notifications";
import { NAV_MAIN, NAV_SECONDARY } from "@/components/shell/nav";
import { cn } from "@/lib/utils";

const TITLES: Record<string, string> = Object.fromEntries(
  [...NAV_MAIN, ...NAV_SECONDARY].map((i) => [i.href, i.label]),
);

export function Topbar({
  onOpenPalette,
  onToggleContext,
  contextOpen,
  onOpenMobileNav,
}: {
  onOpenPalette: () => void;
  onToggleContext: () => void;
  contextOpen: boolean;
  onOpenMobileNav: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const section = "/" + (pathname.split("/")[1] ?? "");
  const title = TITLES[section] ?? "RawCast";

  return (
    <header className="glass sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 px-4 shadow-sm shadow-black/5 transition-all duration-300 md:px-6">
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        aria-label="Open navigation"
        onClick={onOpenMobileNav}
      >
        <Menu className="size-5" />
      </Button>

      <h1 className="min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em]">
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Command palette trigger */}
        <button
          onClick={onOpenPalette}
          className={cn(
            "hidden h-8 w-56 items-center gap-2 rounded-lg border border-border/80 bg-card px-2.5 text-[13px] text-muted-foreground transition-colors sm:flex",
            "hover:border-border hover:bg-accent",
          )}
          aria-label="Search everything"
        >
          <Search className="size-3.5" />
          <span>Search…</span>
          <kbd className="ml-auto rounded border border-border/70 bg-background px-1.5 font-mono text-[10.5px]">
            ⌘K
          </kbd>
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          aria-label="Search"
          onClick={onOpenPalette}
        >
          <Search className="size-4" />
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              className="hidden gap-1.5 sm:flex"
              onClick={() => router.push("/composer")}
            >
              <PenSquare className="size-3.5" />
              Create
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            New post <kbd className="ml-1 font-mono text-[10px]">c</kbd>
          </TooltipContent>
        </Tooltip>

        <NotificationsPopover>
          <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
            <Bell className="size-4" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand ring-2 ring-background" />
          </Button>
        </NotificationsPopover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={mounted && resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {mounted && resolvedTheme === "dark" ? (
                <SunMedium className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Toggle theme</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={contextOpen ? "Hide context panel" : "Show context panel"}
              onClick={onToggleContext}
              className={cn("hidden xl:inline-flex", contextOpen && "bg-accent")}
            >
              <PanelRight className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Context panel <kbd className="ml-1 font-mono text-[10px]">]</kbd>
          </TooltipContent>
        </Tooltip>

        <Avatar className="ml-1 size-7">
          <AvatarFallback className="bg-brand-muted text-[11px] font-semibold text-foreground">
            PP
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
