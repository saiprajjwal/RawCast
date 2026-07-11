"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { ContextPanel } from "@/components/shell/context-panel";
import { CommandPalette } from "@/components/shell/command-palette";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NAV_MAIN, NAV_SECONDARY } from "@/components/shell/nav";
import { cn } from "@/lib/utils";

function readBool(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  return v === null ? fallback : v === "1";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => readBool("rc.sidebar.collapsed", false));
  const [contextOpen, setContextOpen] = useState(() => readBool("rc.context.open", true));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const pendingGo = useRef(false);

  const toggleSidebar = useCallback(() => {
    setCollapsed((c) => {
      window.localStorage.setItem("rc.sidebar.collapsed", c ? "0" : "1");
      return !c;
    });
  }, []);

  const toggleContext = useCallback(() => {
    setContextOpen((c) => {
      window.localStorage.setItem("rc.context.open", c ? "0" : "1");
      return !c;
    });
  }, []);

  // Global keyboard shortcuts: ⌘K, [, ], c, and g-then-key navigation.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "[") {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      if (e.key === "]") {
        e.preventDefault();
        toggleContext();
        return;
      }
      if (e.key === "g") {
        pendingGo.current = true;
        window.setTimeout(() => (pendingGo.current = false), 800);
        return;
      }
      if (pendingGo.current) {
        const item = [...NAV_MAIN, ...NAV_SECONDARY].find((i) => i.goKey === e.key);
        if (item) {
          e.preventDefault();
          router.push(item.href);
        }
        pendingGo.current = false;
        return;
      }
      if (e.key === "c") {
        e.preventDefault();
        router.push("/composer");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, toggleSidebar, toggleContext]);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenPalette={() => setPaletteOpen(true)}
          onToggleContext={toggleContext}
          contextOpen={contextOpen}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main id="main" className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>

      <ContextPanel open={contextOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* Mobile navigation */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border/70 px-4 py-3.5">
            <SheetTitle className="flex items-center gap-2.5 text-[14px]">
              <span className="grid size-7 place-items-center rounded-lg bg-brand text-brand-foreground">
                <Clapperboard className="size-4" />
              </span>
              RawCast Studio
            </SheetTitle>
          </SheetHeader>
          <nav aria-label="Mobile" className="flex flex-col gap-0.5 p-3">
            {[...NAV_MAIN, ...NAV_SECONDARY].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors hover:bg-accent",
                  pathname.startsWith(item.href) && "bg-accent",
                )}
              >
                <item.icon className="size-[18px]" strokeWidth={1.8} />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
