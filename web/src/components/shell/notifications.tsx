"use client";

import { useState } from "react";
import { CheckCheck, CircleAlert, CircleCheck, Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { notifications, type AppNotification } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const TONE_ICON = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
} as const;

const TONE_CLASS = {
  success: "text-success",
  error: "text-destructive",
  info: "text-muted-foreground",
} as const;

function Row({ n }: { n: AppNotification }) {
  const Icon = TONE_ICON[n.tone];
  return (
    <button
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent",
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", TONE_CLASS[n.tone])} strokeWidth={1.8} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cn("truncate text-[13px] font-medium", !n.unread && "text-foreground/80")}>
            {n.title}
          </span>
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{n.time}</span>
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">{n.body}</span>
      </span>
      {n.unread && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
    </button>
  );
}

export function NotificationsPopover({ children }: { children: React.ReactNode }) {
  const [group, setGroup] = useState<string>("all");
  const filtered =
    group === "all" ? notifications : notifications.filter((n) => n.group === group);

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[380px] p-0 elevation-3">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <h2 className="text-[13.5px] font-semibold">Notifications</h2>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-[12px] text-muted-foreground">
            <CheckCheck className="size-3.5" /> Mark all read
          </Button>
        </div>
        <div className="px-3 pt-2.5">
          <Tabs value={group} onValueChange={setGroup}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-[12px]">All</TabsTrigger>
              <TabsTrigger value="publishing" className="text-[12px]">Publishing</TabsTrigger>
              <TabsTrigger value="mentions" className="text-[12px]">Mentions</TabsTrigger>
              <TabsTrigger value="team" className="text-[12px]">Team</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-1.5 scrollbar-thin">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">
              Nothing here — you&apos;re all caught up.
            </p>
          ) : (
            filtered.map((n) => <Row key={n.id} n={n} />)
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
