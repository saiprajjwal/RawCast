"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Check,
  Link2,
  Moon,
  Pencil,
  Plus,
  SunMedium,
  X,
} from "lucide-react";
import { Page, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChannels, useRenameChannel } from "@/lib/queries";
import { api } from "@/lib/api";
import { PLATFORMS, PlatformIcon, PLATFORM_LIST, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";

function ChannelRow({
  id,
  name,
  platform,
}: {
  id: string;
  name: string;
  platform: PlatformId;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const rename = useRenameChannel();

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) {
      rename.mutate({ id, name: trimmed });
    } else {
      setValue(name);
    }
    setEditing(false);
  };

  return (
    <li className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent/60">
      <PlatformIcon platform={platform} colored className="size-4" />
      {editing ? (
        <span className="flex flex-1 items-center gap-1.5">
          <Input
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setValue(name);
                setEditing(false);
              }
            }}
            className="h-7 max-w-64 text-[13px]"
            aria-label="Channel name"
          />
          <Button variant="ghost" size="icon-sm" aria-label="Save name" onClick={commit}>
            <Check className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel"
            onClick={() => {
              setValue(name);
              setEditing(false);
            }}
          >
            <X className="size-3.5" />
          </Button>
        </span>
      ) : (
        <>
          <span className="flex-1 truncate text-[13.5px] font-medium">{name}</span>
          <span className="flex items-center gap-1 text-[11.5px] text-success">
            <span className="size-1.5 rounded-full bg-success" /> Connected
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Rename ${name}`}
            className="text-muted-foreground"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
          </Button>
        </>
      )}
    </li>
  );
}

function ChannelsTab() {
  const { data: channels, isLoading } = useChannels();

  return (
    <div className="space-y-4">
      {PLATFORM_LIST.filter((p) => p.id !== "pinterest").map((meta) => {
        const list = channels?.[meta.id] ?? [];
        const isYouTube = meta.id === "youtube";
        return (
          <Card key={meta.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[14px]">
                <PlatformIcon platform={meta.id} colored className="size-4" />
                {meta.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-full rounded-lg" />
              ) : list.length > 0 ? (
                <ul className="space-y-0.5">
                  {list.map((c) => (
                    <ChannelRow key={c.id} id={c.id} name={c.name} platform={meta.id} />
                  ))}
                  {isYouTube && (
                    <li className="pt-1.5">
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <a href={api.youtubeAuthUrl} target="_blank" rel="noreferrer">
                          <Plus className="size-3.5" /> Connect another channel
                        </a>
                      </Button>
                    </li>
                  )}
                </ul>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3.5 py-3">
                  <p className="text-[12.5px] text-muted-foreground">
                    {isYouTube
                      ? "No channels connected yet."
                      : `${meta.name} publishing is on the roadmap — previews already work in the Composer.`}
                  </p>
                  {isYouTube ? (
                    <Button size="sm" className="gap-1.5" asChild>
                      <a href={api.youtubeAuthUrl} target="_blank" rel="noreferrer">
                        <Link2 className="size-3.5" /> Connect with Google
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      Coming soon
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PreferencesTab() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-[14px]">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {(
              [
                ["light", "Light", SunMedium],
                ["dark", "Dark", Moon],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                aria-pressed={resolvedTheme === value}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                  resolvedTheme === value
                    ? "border-brand/50 bg-brand-muted/30 ring-1 ring-brand/30"
                    : "border-border/80 hover:border-border hover:bg-accent/50",
                )}
              >
                <span
                  className={cn(
                    "grid h-16 w-full max-w-40 place-items-center rounded-lg border border-border/60",
                    value === "light" ? "bg-[oklch(0.98_0.002_84)]" : "bg-[oklch(0.17_0.005_76)]",
                  )}
                >
                  <Icon className={cn("size-5", value === "light" ? "text-amber-500" : "text-amber-300")} />
                </span>
                <span className="text-[13px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[14px]">Publishing defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              ["Default to 6:00 PM when scheduling", true],
              ["Notify me when a post publishes", true],
              ["Notify me when an upload fails", true],
              ["Auto-delete local files after upload", true],
            ] as const
          ).map(([label, def]) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <Label className="text-[13px] font-normal">{label}</Label>
              <Switch defaultChecked={def} aria-label={label} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function WorkspaceTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[14px]">Workspace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="ws-name" className="mb-1.5 block text-[12.5px]">
            Workspace name
          </Label>
          <Input id="ws-name" defaultValue="RawCast Studio" className="max-w-sm" />
        </div>
        <div>
          <Label htmlFor="ws-tz" className="mb-1.5 block text-[12.5px]">
            Timezone
          </Label>
          <Input
            id="ws-tz"
            defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}
            className="max-w-sm"
            readOnly
          />
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            Schedules use this timezone when talking to platforms.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <Page>
      <PageHeader title="Settings" description="Channels, workspace and personal preferences." />
      <Tabs defaultValue="channels">
        <TabsList className="mb-4">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
        </TabsList>
        <TabsContent value="channels">
          <ChannelsTab />
        </TabsContent>
        <TabsContent value="preferences">
          <PreferencesTab />
        </TabsContent>
        <TabsContent value="workspace">
          <WorkspaceTab />
        </TabsContent>
      </Tabs>
    </Page>
  );
}
