"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO, isAfter, startOfToday } from "date-fns";
import { Sparkles, Clock, Keyboard, ArrowRight, CircleCheck, CircleAlert } from "lucide-react";
import { usePosts } from "@/lib/queries";
import { aiSuggestions, notifications } from "@/lib/mock-data";
import { PlatformIcon, type PlatformId } from "@/lib/platforms";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-4">
      <h3 className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" strokeWidth={1.8} />
        {title}
      </h3>
      {children}
    </section>
  );
}

function UpcomingSchedule() {
  const { data: posts, isLoading } = usePosts();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const upcoming = (posts ?? [])
    .filter((p) => p.status === "pending" || isAfter(parseISO(p.date), startOfToday()))
    .slice(0, 4);

  if (upcoming.length === 0) {
    return (
      <button
        onClick={() => router.push("/composer")}
        className="w-full rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12.5px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
      >
        Nothing scheduled — create your first post
      </button>
    );
  }

  return (
    <ul className="space-y-1">
      {upcoming.map((post) => {
        const platform = (post.selections[0]?.split(":")[0] ?? "youtube") as PlatformId;
        return (
          <li key={post.id}>
            <button
              onClick={() => router.push("/calendar")}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
            >
              <PlatformIcon platform={platform} colored className="size-4" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{post.title}</span>
                <span className="block text-[11.5px] text-muted-foreground tnum">
                  {format(parseISO(post.date), "EEE, MMM d")} · {post.time}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AiSuggestions() {
  return (
    <ul className="space-y-2">
      {aiSuggestions.slice(0, 2).map((s) => (
        <li
          key={s.id}
          className="rounded-lg border border-brand/25 bg-brand-muted/40 px-3 py-2.5"
        >
          <p className="text-[12.5px] font-medium">{s.title}</p>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
            {s.body}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Activity() {
  return (
    <ul className="space-y-1">
      {notifications.slice(0, 3).map((n) => (
        <li key={n.id} className="flex items-start gap-2.5 rounded-lg px-2.5 py-2">
          {n.tone === "success" ? (
            <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
          ) : n.tone === "error" ? (
            <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          ) : (
            <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-[12.5px]">{n.title}</span>
            <span className="text-[11px] text-muted-foreground">{n.time}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const SHORTCUTS: [string, string][] = [
  ["⌘K", "Search everything"],
  ["c", "New post"],
  ["g d", "Dashboard"],
  ["g c", "Calendar"],
  ["[", "Toggle sidebar"],
  ["]", "Toggle this panel"],
];

function Shortcuts() {
  return (
    <ul className="space-y-1.5">
      {SHORTCUTS.map(([key, label]) => (
        <li key={key} className="flex items-center justify-between text-[12.5px]">
          <span className="text-muted-foreground">{label}</span>
          <kbd className="rounded border border-border/80 bg-card px-1.5 py-0.5 font-mono text-[10.5px]">
            {key}
          </kbd>
        </li>
      ))}
    </ul>
  );
}

export function ContextPanel({ open }: { open: boolean }) {
  const pathname = usePathname();
  const section = pathname.split("/")[1] ?? "";

  // Panel content adapts to the page you're on.
  const showSchedule = ["dashboard", "calendar", "composer", "queue"].includes(section);
  const showAi = ["dashboard", "composer", "assistant", "analytics"].includes(section);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="context"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 288, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 38 }}
          className="hidden h-dvh shrink-0 overflow-hidden border-l border-border/70 bg-sidebar/50 xl:block"
          aria-label="Context panel"
        >
          <div className={cn("h-full w-72 overflow-y-auto scrollbar-thin", "divide-y divide-border/60")}>
            {showSchedule && (
              <Section icon={Clock} title="Up next">
                <UpcomingSchedule />
              </Section>
            )}
            {showAi && (
              <Section icon={Sparkles} title="AI suggestions">
                <AiSuggestions />
              </Section>
            )}
            <Section icon={ArrowRight} title="Activity">
              <Activity />
            </Section>
            <Section icon={Keyboard} title="Shortcuts">
              <Shortcuts />
            </Section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
