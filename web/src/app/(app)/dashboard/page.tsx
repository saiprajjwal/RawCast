"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO, isToday } from "date-fns";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  FileText,
  Link2,
  PenSquare,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import { Page, PageHeader, Rise, StatDelta, EmptyState, num } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useChannels, usePosts } from "@/lib/queries";
import { weeklyPerformance, aiSuggestions, drafts, platformStats } from "@/lib/mock-data";
import { PLATFORMS, PlatformIcon, type PlatformId } from "@/lib/platforms";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const perf = weeklyPerformance(14);

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Scheduled", cls: "bg-brand-muted text-foreground" },
    uploaded: { label: "Published", cls: "bg-success/12 text-success" },
    failed: { label: "Failed", cls: "bg-destructive/12 text-destructive" },
  };
  const m = map[status] ?? map.pending;
  return <Badge className={cn("border-0 font-medium", m.cls)}>{m.label}</Badge>;
}

function TodayCard() {
  const { data: posts, isLoading, isError } = usePosts();
  const router = useRouter();

  const today = (posts ?? []).filter((p) => isToday(parseISO(p.date)));
  const upcoming = (posts ?? []).filter((p) => p.status === "pending").slice(0, 4);
  const rows = today.length > 0 ? today : upcoming;

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle>{today.length > 0 ? "Today" : "Up next"}</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
            <Link href="/calendar">
              Calendar <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={CalendarDays}
            title="Couldn't reach the backend"
            description="Make sure the RawCast backend is running and reachable, then retry."
            action={
              <Button size="sm" variant="outline" onClick={() => location.reload()}>
                Retry
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="Nothing scheduled yet"
            description="Your queue is clear. Draft something now and let RawCast publish it at the perfect time."
            action={
              <Button size="sm" onClick={() => router.push("/composer")} className="gap-1.5">
                <PenSquare className="size-3.5" /> Create a post
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((post) => {
              const platform = (post.selections[0]?.split(":")[0] ?? "youtube") as PlatformId;
              return (
                <li key={post.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-lg"
                    style={{ background: `color-mix(in oklch, ${PLATFORMS[platform].color} 10%, transparent)` }}
                  >
                    <PlatformIcon platform={platform} colored className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{post.title}</span>
                    <span className="block text-[12px] text-muted-foreground tnum">
                      {format(parseISO(post.date), "EEE, MMM d")} · {post.time}
                    </span>
                  </span>
                  <StatusBadge status={post.status} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PerformanceCard() {
  const total = perf.reduce((s, p) => s + p.engagement, 0);
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle>Engagement · last 14 days</CardTitle>
        <CardAction>
          <StatDelta value={11.2} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="mb-1 text-2xl font-semibold tracking-tight tnum">{num(total)}</p>
        <div className="h-[168px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={perf} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="fillBrand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => format(parseISO(d), "MMM d")}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval={3}
                dy={6}
              />
              <YAxis hide domain={["dataMin - 100", "dataMax + 100"]} />
              <ChartTooltip
                cursor={{ stroke: "var(--border)" }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[12px] elevation-2">
                      <p className="text-muted-foreground">
                        {format(parseISO(payload[0].payload.date), "EEE, MMM d")}
                      </p>
                      <p className="font-semibold tnum">{num(payload[0].value as number)} engagements</p>
                    </div>
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey="engagement"
                stroke="var(--brand)"
                strokeWidth={2}
                fill="url(#fillBrand)"
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformsCard() {
  const { data: channels, isLoading } = useChannels();
  const connectedYt = channels?.youtube?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platforms</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
            <a href={api.youtubeAuthUrl} target="_blank" rel="noreferrer">
              <Plus className="size-3.5" /> Connect
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
        ) : (
          <>
            {platformStats.slice(0, 4).map((s) => {
              const isYt = s.platform === "youtube";
              const isFb = s.platform === "facebook";
              const isIg = s.platform === "instagram";
              const isTt = s.platform === "tiktok";
              const connectedCount = channels?.[s.platform]?.length ?? 0;
              const connected = connectedCount > 0;
              
              const authUrl =
                isYt ? api.youtubeAuthUrl :
                isTt ? api.tiktokAuthUrl :
                isIg ? api.instagramAuthUrl :
                isFb ? api.facebookAuthUrl : "#";

              return (
                <div key={s.platform} className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent">
                  <PlatformIcon platform={s.platform} colored className="size-4" />
                  <span className="flex-1 text-[13px] font-medium">{PLATFORMS[s.platform].name}</span>
                  {connected ? (
                    <span className="text-[12px] text-muted-foreground tnum">
                      {connectedCount} connected
                    </span>
                  ) : (
                    <a
                      href={authUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:underline"
                    >
                      <Link2 className="size-3" /> Connect
                    </a>
                  )}
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AiCard() {
  return (
    <Card className="border-brand/25 bg-gradient-to-b from-brand-muted/35 to-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-brand" /> AI recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {aiSuggestions.map((s) => (
          <div key={s.id} className="rounded-lg bg-card/80 p-3 elevation-1">
            <p className="text-[13px] font-medium">{s.title}</p>
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-full gap-1.5" asChild>
          <Link href="/assistant">
            Open assistant <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function DraftsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Drafts</CardTitle>
        <CardAction>
          <Badge variant="secondary" className="tnum">{drafts.length}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border/60">
          {drafts.map((d) => (
            <li key={d.id}>
              <Link
                href="/composer"
                className="flex items-center gap-3 py-2.5 transition-colors first:pt-0 last:pb-0 hover:opacity-80"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{d.title}</span>
                  <span className="text-[11.5px] text-muted-foreground">
                    Edited {format(parseISO(d.updated), "MMM d")}
                  </span>
                </span>
                <span className="flex -space-x-1">
                  {d.platforms.map((p) => (
                    <span key={p} className="grid size-5 place-items-center rounded-full bg-card ring-1 ring-border">
                      <PlatformIcon platform={p} colored className="size-2.5" />
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const QUICK_ACTIONS = [
  { label: "New post", icon: PenSquare, href: "/composer" },
  { label: "Upload media", icon: Upload, href: "/library" },
  { label: "Plan week", icon: CalendarDays, href: "/calendar" },
  { label: "Ask AI", icon: Sparkles, href: "/assistant" },
];

export default function DashboardPage() {
  const { data: posts } = usePosts();
  const scheduled = posts?.filter((p) => p.status === "pending").length ?? 0;
  const published = posts?.filter((p) => p.status === "uploaded").length ?? 0;

  return (
    <Page wide>
      <PageHeader
        title="Good evening, Prajjwal"
        description={
          scheduled > 0
            ? `${scheduled} post${scheduled === 1 ? "" : "s"} scheduled · ${published} published — everything is on track.`
            : "A calm queue is a good queue. Plan something for the week ahead."
        }
        actions={
          <div className="flex gap-2">
            {QUICK_ACTIONS.map((a) => (
              <Button key={a.label} variant="outline" size="sm" className="gap-1.5" asChild>
                <Link href={a.href}>
                  <a.icon className="size-3.5" /> {a.label}
                </Link>
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Rise className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1" delay={0}>
          <TodayCard />
        </Rise>
        <Rise className="col-span-full lg:col-span-2" delay={0.05}>
          <PerformanceCard />
        </Rise>
        <Rise delay={0.1} className="sm:col-span-1">
          <PlatformsCard />
        </Rise>
        <Rise delay={0.14} className="sm:col-span-1">
          <DraftsCard />
        </Rise>
        <Rise delay={0.18} className="col-span-full sm:col-span-2 lg:col-span-2">
          <AiCard />
        </Rise>
      </div>
    </Page>
  );
}
