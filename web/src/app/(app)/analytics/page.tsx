"use client";

import { Fragment, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eye, MousePointerClick, ThumbsUp, UserPlus } from "lucide-react";
import { Page, PageHeader, Rise, StatDelta, num } from "@/components/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { weeklyPerformance, platformStats, topPosts, bestTimes } from "@/lib/mock-data";
import { PLATFORMS, PlatformIcon } from "@/lib/platforms";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const heat = bestTimes();

function MetricTip({ active, payload, label, suffix }: { active?: boolean; payload?: { value: number }[]; label?: string; suffix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[12px] elevation-2">
      <p className="text-muted-foreground">{label && format(parseISO(label), "EEE, MMM d")}</p>
      <p className="font-semibold tnum">
        {num(payload[0].value)}
        {suffix}
      </p>
    </div>
  );
}

const METRICS = [
  { key: "reach", label: "Reach", icon: Eye, delta: 12.4 },
  { key: "impressions", label: "Impressions", icon: Eye, delta: 8.1 },
  { key: "clicks", label: "Clicks", icon: MousePointerClick, delta: -2.3 },
  { key: "engagement", label: "Engagement", icon: ThumbsUp, delta: 11.2 },
  { key: "followers", label: "Followers", icon: UserPlus, delta: 4.6 },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

export default function AnalyticsPage() {
  const [range, setRange] = useState<"14" | "28">("28");
  const [metric, setMetric] = useState<MetricKey>("reach");
  const data = useMemo(() => weeklyPerformance(Number(range)), [range]);
  const active = METRICS.find((m) => m.key === metric)!;

  const totals = useMemo(() => {
    const t: Record<MetricKey, number> = { reach: 0, impressions: 0, clicks: 0, engagement: 0, followers: 0 };
    for (const d of data) {
      t.reach += d.reach;
      t.impressions += d.impressions;
      t.clicks += d.clicks;
      t.engagement += d.engagement;
    }
    t.followers = data.at(-1)?.followers ?? 0;
    return t;
  }, [data]);

  return (
    <Page wide>
      <PageHeader
        title="Analytics"
        description="How your content performed across platforms. Demo data until platform APIs land."
        actions={
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v as "14" | "28")}
            className="rounded-lg border border-border/80 bg-card p-0.5"
          >
            <ToggleGroupItem value="14" className="h-7 rounded-md px-3 text-[12.5px] data-[state=on]:bg-accent">14 days</ToggleGroupItem>
            <ToggleGroupItem value="28" className="h-7 rounded-md px-3 text-[12.5px] data-[state=on]:bg-accent">28 days</ToggleGroupItem>
          </ToggleGroup>
        }
      />

      {/* Metric tiles — click to switch the main chart */}
      <Rise className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            aria-pressed={metric === m.key}
            className={cn(
              "rounded-xl border bg-card p-3.5 text-left transition-all",
              metric === m.key ? "border-brand/50 ring-1 ring-brand/30 elevation-2" : "border-border/80 elevation-1 hover:border-border hover:elevation-2",
            )}
          >
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
              <m.icon className="size-3.5" strokeWidth={1.7} /> {m.label}
            </p>
            <p className="mt-1.5 text-xl font-semibold tracking-tight tnum">{num(totals[m.key])}</p>
            <div className="mt-1"><StatDelta value={m.delta} /></div>
          </button>
        ))}
      </Rise>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main trend */}
        <Rise className="lg:col-span-2" delay={0.05}>
          <Card>
            <CardHeader>
              <CardTitle>{active.label} over time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -14 }}>
                    <defs>
                      <linearGradient id="fillMetric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => format(parseISO(d), "MMM d")}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      interval={Math.floor(data.length / 6)}
                      dy={6}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => num(v)}
                      width={54}
                    />
                    <ChartTooltip content={<MetricTip />} cursor={{ stroke: "var(--border)" }} />
                    <Area
                      type="monotone"
                      dataKey={metric}
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      fill="url(#fillMetric)"
                      animationDuration={500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Rise>

        {/* Platform comparison */}
        <Rise delay={0.1}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Platform comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={platformStats.map((s) => ({ name: PLATFORMS[s.platform].name, reach: s.reach, fill: PLATFORMS[s.platform].color }))}
                    layout="vertical"
                    margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11.5, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      width={72}
                    />
                    <ChartTooltip
                      cursor={{ fill: "var(--accent)" }}
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[12px] elevation-2">
                            <p className="font-semibold tnum">{num(payload[0].value as number)} reach</p>
                          </div>
                        ) : null
                      }
                    />
                    <Bar dataKey="reach" radius={[4, 4, 4, 4]} barSize={18} animationDuration={500} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Rise>

        {/* Best posting times heatmap */}
        <Rise delay={0.14}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Best times to post</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[auto_repeat(9,1fr)] gap-1" role="img" aria-label="Engagement heatmap by weekday and hour. Peak: Thursday 5 to 7 PM.">
                <span />
                {[6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => (
                  <span key={h} className="text-center text-[9.5px] text-muted-foreground tnum">
                    {h % 12 === 0 ? 12 : h % 12}{h < 12 ? "a" : "p"}
                  </span>
                ))}
                {DAYS.map((d, day) => (
                  <Fragment key={d}>
                    <span className="pr-1.5 text-right text-[10px] leading-4 text-muted-foreground">{d}</span>
                    {heat
                      .filter((c) => c.day === day)
                      .map((c) => (
                        <span
                          key={`${c.day}-${c.hour}`}
                          title={`${d} ${c.hour}:00 — ${(c.value * 100).toFixed(0)}% of peak`}
                          className="h-4 rounded-[4px]"
                          style={{ background: `color-mix(in oklch, var(--brand) ${Math.round(c.value * 88) + 6}%, var(--muted))` }}
                        />
                      ))}
                  </Fragment>
                ))}
              </div>
              <p className="mt-3 text-[12px] text-muted-foreground">
                Your audience is most active <span className="font-medium text-foreground">Thu 5–7 PM</span>. Darker means more engagement.
              </p>
            </CardContent>
          </Card>
        </Rise>

        {/* Follower growth */}
        <Rise delay={0.18} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Follower growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -14 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => format(parseISO(d), "MMM d")}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      interval={Math.floor(data.length / 6)}
                      dy={6}
                    />
                    <YAxis
                      domain={["dataMin - 50", "dataMax + 50"]}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => num(v)}
                      width={54}
                    />
                    <ChartTooltip content={<MetricTip suffix=" followers" />} cursor={{ stroke: "var(--border)" }} />
                    <Line type="monotone" dataKey="followers" stroke="var(--chart-1)" strokeWidth={2} dot={false} animationDuration={500} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Rise>

        {/* Top posts */}
        <Rise delay={0.22} className="col-span-full">
          <Card>
            <CardHeader>
              <CardTitle>Top posts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Post</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Reach</TableHead>
                    <TableHead className="text-right">Engagement</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Published</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPosts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-64 truncate font-medium">{p.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1.5 font-normal">
                          <PlatformIcon platform={p.platform} colored className="size-3" />
                          {PLATFORMS[p.platform].name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tnum">{num(p.reach)}</TableCell>
                      <TableCell className="text-right tnum">{p.engagement}%</TableCell>
                      <TableCell className="text-right tnum">{num(p.clicks)}</TableCell>
                      <TableCell className="text-right text-muted-foreground tnum">
                        {format(parseISO(p.published), "MMM d")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Rise>
      </div>
    </Page>
  );
}
