"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  PenSquare,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePosts, useDeletePost, useReschedulePost } from "@/lib/queries";
import type { ApiPost } from "@/lib/api";
import { PLATFORMS, PlatformIcon, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";

type View = "month" | "week" | "agenda";

function platformOf(post: ApiPost): PlatformId {
  return (post.selections[0]?.split(":")[0] ?? "youtube") as PlatformId;
}

/* ------------------------------------------------------------------ */
/* Post chip + preview                                                 */
/* ------------------------------------------------------------------ */

function PostChip({
  post,
  compact = false,
}: {
  post: ApiPost;
  compact?: boolean;
}) {
  const router = useRouter();
  const platform = platformOf(post);
  const meta = PLATFORMS[platform];
  const deletePost = useDeletePost();
  const reschedule = useReschedulePost();
  const draggable = post.status === "pending";
  const [moveDate, setMoveDate] = useState(post.date);
  const [moveTime, setMoveTime] = useState(post.time);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          draggable={draggable}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/rawcast-post", post.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          className={cn(
            "group flex w-full items-center gap-1.5 rounded-md border-l-2 px-1.5 py-1 text-left transition-all",
            "bg-card elevation-1 hover:elevation-2 hover:-translate-y-px",
            draggable ? "cursor-grab active:cursor-grabbing" : "opacity-75",
            compact ? "text-[11px]" : "text-[12px]",
          )}
          style={{ borderLeftColor: meta.color }}
          aria-label={`${post.title}, ${meta.name}, ${post.time}${draggable ? ". Draggable" : ""}`}
        >
          <PlatformIcon platform={platform} colored className={compact ? "size-2.5" : "size-3"} />
          {!compact && <span className="text-muted-foreground tnum">{post.time}</span>}
          <span className="min-w-0 flex-1 truncate font-medium">{post.title}</span>
          {draggable && (
            <GripVertical className="size-3 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/60" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={6} className="w-72 p-0 elevation-3">
        <div className="border-b border-border/70 p-3.5">
          <div className="flex items-start gap-2.5">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-lg"
              style={{ background: `color-mix(in oklch, ${meta.color} 10%, transparent)` }}
            >
              <PlatformIcon platform={platform} colored className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold">{post.title}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground tnum">
                <Clock className="size-3" />
                {format(parseISO(post.date), "EEE, MMM d")} · {post.time}
              </p>
            </div>
            <Badge
              className={cn(
                "ml-auto shrink-0 border-0 text-[10.5px]",
                post.status === "uploaded" && "bg-success/12 text-success",
                post.status === "pending" && "bg-brand-muted text-foreground",
                post.status === "failed" && "bg-destructive/12 text-destructive",
              )}
            >
              {post.status === "uploaded" ? "Published" : post.status === "pending" ? "Scheduled" : "Failed"}
            </Badge>
          </div>
          {post.caption && (
            <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{post.caption}</p>
          )}
        </div>

        {post.status === "pending" && (
          <div className="space-y-2 border-b border-border/70 p-3.5">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Reschedule</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor={`d-${post.id}`} className="sr-only">Date</Label>
                <Input
                  id={`d-${post.id}`}
                  type="date"
                  value={moveDate}
                  onChange={(e) => setMoveDate(e.target.value)}
                  className="h-8 text-[12.5px]"
                />
              </div>
              <div className="w-24">
                <Label htmlFor={`t-${post.id}`} className="sr-only">Time</Label>
                <Input
                  id={`t-${post.id}`}
                  type="time"
                  value={moveTime}
                  onChange={(e) => setMoveTime(e.target.value)}
                  className="h-8 text-[12.5px]"
                />
              </div>
              <Button
                size="sm"
                className="h-8"
                disabled={reschedule.isPending || (moveDate === post.date && moveTime === post.time)}
                onClick={() => {
                  reschedule.mutate(
                    { id: post.id, date: moveDate, time: moveTime },
                    { onSuccess: () => { toast.success("Rescheduled"); setOpen(false); } },
                  );
                }}
              >
                Save
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-[12.5px]"
            onClick={() => router.push("/composer")}
          >
            <PenSquare className="size-3.5" /> Open in composer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-1.5 text-[12.5px] text-destructive hover:text-destructive"
            onClick={() => {
              setOpen(false);
              deletePost.mutate(post.id, {
                onSuccess: () => toast.success("Post deleted"),
              });
            }}
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Day cell (month view)                                               */
/* ------------------------------------------------------------------ */

function DayCell({
  day,
  cursor,
  posts,
  onDropPost,
}: {
  day: Date;
  cursor: Date;
  posts: ApiPost[];
  onDropPost: (id: string, date: Date) => void;
}) {
  const router = useRouter();
  const [over, setOver] = useState(false);
  const inMonth = isSameMonth(day, cursor);
  const dateStr = format(day, "yyyy-MM-dd");

  return (
    <div
      role="gridcell"
      aria-label={format(day, "EEEE, MMMM d")}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("text/rawcast-post")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/rawcast-post");
        if (id) onDropPost(id, day);
      }}
      className={cn(
        "group/day relative flex min-h-[104px] flex-col gap-1 border-b border-r border-border/60 p-1.5 transition-colors",
        !inMonth && "bg-muted/40",
        over && "bg-brand-muted/50 ring-2 ring-inset ring-brand/50",
      )}
    >
      <div className="flex items-center justify-between px-0.5">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full text-[12px] tnum",
            isToday(day)
              ? "bg-brand font-semibold text-brand-foreground"
              : inMonth
                ? "text-foreground/80"
                : "text-muted-foreground/50",
          )}
        >
          {format(day, "d")}
        </span>
        <button
          onClick={() => router.push(`/composer?date=${dateStr}`)}
          aria-label={`New post on ${format(day, "MMM d")}`}
          className="grid size-5 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover/day:opacity-100 focus-visible:opacity-100"
        >
          <CalendarPlus className="size-3.5" />
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {posts.slice(0, 3).map((p) => (
          <PostChip key={p.id} post={p} compact />
        ))}
        {posts.length > 3 && (
          <span className="px-1 text-[11px] text-muted-foreground">+{posts.length - 3} more</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CalendarPage() {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const { data: posts, isLoading } = usePosts();
  const reschedule = useReschedulePost();
  const router = useRouter();

  const byDate = useMemo(() => {
    const map = new Map<string, ApiPost[]>();
    for (const p of posts ?? []) {
      const arr = map.get(p.date) ?? [];
      arr.push(p);
      map.set(p.date, arr);
    }
    return map;
  }, [posts]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const agenda = useMemo(() => {
    const sorted = [...(posts ?? [])].sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time),
    );
    const groups = new Map<string, ApiPost[]>();
    for (const p of sorted) {
      const arr = groups.get(p.date) ?? [];
      arr.push(p);
      groups.set(p.date, arr);
    }
    return [...groups.entries()];
  }, [posts]);

  const shift = (dir: 1 | -1) =>
    setCursor((c) => (view === "week" ? addWeeks(c, dir) : addMonths(c, dir)));

  const onDropPost = (id: string, day: Date) => {
    const post = posts?.find((p) => p.id === id);
    if (!post) return;
    const date = format(day, "yyyy-MM-dd");
    if (post.date === date) return;
    if (post.status !== "pending") {
      toast.error("Published posts can't be moved");
      return;
    }
    reschedule.mutate(
      { id, date },
      { onSuccess: () => toast.success(`Moved to ${format(day, "EEE, MMM d")}`) },
    );
  };

  return (
    <Page wide className="flex h-full flex-col pb-4">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 min-w-40 text-xl font-semibold tracking-[-0.015em] tnum">
          {format(cursor, view === "week" ? "'Week of' MMM d" : "MMMM yyyy")}
        </h2>
        <div className="flex items-center rounded-lg border border-border/80 bg-card p-0.5">
          <Button variant="ghost" size="icon-sm" aria-label="Previous" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-[12.5px]"
            onClick={() => setCursor(new Date())}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next" onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as View)}
          className="ml-auto rounded-lg border border-border/80 bg-card p-0.5"
        >
          {(["month", "week", "agenda"] as const).map((v) => (
            <ToggleGroupItem
              key={v}
              value={v}
              aria-label={`${v} view`}
              className="h-7 rounded-md px-3 text-[12.5px] capitalize data-[state=on]:bg-accent"
            >
              {v}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Button size="sm" className="gap-1.5" onClick={() => router.push("/composer")}>
          <CalendarPlus className="size-3.5" /> Schedule
        </Button>
      </div>

      {/* Platform legend */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {(["youtube", "instagram", "tiktok", "x", "linkedin"] as PlatformId[]).map((p) => (
          <span key={p} className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: PLATFORMS[p].color }} />
            {PLATFORMS[p].name}
          </span>
        ))}
        <span className="ml-auto hidden text-[11.5px] text-muted-foreground sm:block">
          Drag a post onto a day to reschedule
        </span>
      </div>

      {isLoading ? (
        <Skeleton className="h-[560px] w-full rounded-xl" />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view + format(cursor, "yyyy-MM-dd")}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-0 flex-1"
          >
            {view === "month" && (
              <div role="grid" aria-label={format(cursor, "MMMM yyyy")} className="overflow-hidden rounded-xl border border-border/80 bg-card elevation-1">
                <div role="row" className="grid grid-cols-7 border-b border-border/70 bg-muted/50">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <span key={d} role="columnheader" className="px-2 py-2 text-center text-[11.5px] font-medium text-muted-foreground">
                      {d}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthDays.map((day) => (
                    <DayCell
                      key={day.toISOString()}
                      day={day}
                      cursor={cursor}
                      posts={byDate.get(format(day, "yyyy-MM-dd")) ?? []}
                      onDropPost={onDropPost}
                    />
                  ))}
                </div>
              </div>
            )}

            {view === "week" && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
                {weekDays.map((day) => {
                  const dayPosts = (byDate.get(format(day, "yyyy-MM-dd")) ?? []).sort((a, b) =>
                    a.time.localeCompare(b.time),
                  );
                  return (
                    <div
                      key={day.toISOString()}
                      onDragOver={(e) => {
                        if (e.dataTransfer.types.includes("text/rawcast-post")) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        const id = e.dataTransfer.getData("text/rawcast-post");
                        if (id) onDropPost(id, day);
                      }}
                      className={cn(
                        "flex min-h-[300px] flex-col gap-1.5 rounded-xl border border-border/80 bg-card p-2.5 elevation-1",
                        isToday(day) && "ring-1 ring-brand/40",
                      )}
                    >
                      <p className={cn("mb-1 text-[12px] font-medium", isToday(day) ? "text-brand" : "text-muted-foreground")}>
                        {format(day, "EEE")}{" "}
                        <span className="tnum">{format(day, "d")}</span>
                      </p>
                      {dayPosts.map((p) => (
                        <PostChip key={p.id} post={p} />
                      ))}
                      <button
                        onClick={() => router.push(`/composer?date=${format(day, "yyyy-MM-dd")}`)}
                        className="mt-auto rounded-lg border border-dashed border-border py-1.5 text-[11.5px] text-muted-foreground opacity-0 transition-opacity hover:border-ring hover:text-foreground focus-visible:opacity-100 [div:hover>&]:opacity-100"
                      >
                        + Add
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {view === "agenda" && (
              <div className="mx-auto max-w-2xl">
                {agenda.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-12 text-center text-[13px] text-muted-foreground">
                    Nothing scheduled. Press <kbd className="rounded border border-border bg-card px-1.5 font-mono text-[11px]">c</kbd> to create a post.
                  </div>
                ) : (
                  agenda.map(([date, dayPosts]) => (
                    <section key={date} className="mb-5">
                      <h3
                        className={cn(
                          "mb-2 text-[12px] font-semibold uppercase tracking-wide",
                          isSameDay(parseISO(date), new Date()) ? "text-brand" : "text-muted-foreground",
                        )}
                      >
                        {format(parseISO(date), "EEEE, MMMM d")}
                        {isSameDay(parseISO(date), new Date()) && " · Today"}
                      </h3>
                      <div className="space-y-1.5">
                        {dayPosts.map((p) => (
                          <PostChip key={p.id} post={p} />
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </Page>
  );
}
