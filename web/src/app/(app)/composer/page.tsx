"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { format, addDays } from "date-fns";
import {
  CalendarClock,
  CircleAlert,
  Clapperboard,
  ImagePlus,
  Loader2,
  Save,
  Smile,
  Sparkles,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlatformPreview, type PreviewData } from "@/components/composer/previews";
import { PLATFORMS, PlatformIcon, type PlatformId } from "@/lib/platforms";
import { useChannels, useCreatePost } from "@/lib/queries";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const PREVIEWABLE: PlatformId[] = ["youtube", "instagram", "facebook", "linkedin", "x", "tiktok"];

const CATEGORIES = [
  ["22", "People & Blogs"],
  ["24", "Entertainment"],
  ["27", "Education"],
  ["28", "Science & Technology"],
  ["26", "Howto & Style"],
  ["20", "Gaming"],
  ["10", "Music"],
  ["1", "Film & Animation"],
] as const;

const EMOJI = ["✨", "🔥", "🎬", "🎥", "📸", "🚀", "💡", "🎯", "❤️", "😂", "👀", "🙌", "☀️", "🌙", "🎉", "💬", "📈", "🧠", "⏰", "✅"];

interface FormValues {
  title: string;
  caption: string;
  hashtags: string;
  date: string;
  time: string;
  channelId: string;
  categoryId: string;
  madeForKids: boolean;
  altText: string;
  firstComment: string;
}

/* Mock AI — canned but believable, with latency + loading states. */
const AI_CAPTIONS = [
  "Spent the last three weeks rebuilding the studio from scratch — new lighting rig, acoustic panels, and a color pipeline that finally makes sense. Here's the full breakdown, including everything I'd do differently.",
  "Most creators overcomplicate their setup. In this one I break down the exact three-light configuration I use for every shoot — total cost, under $100.",
];

function ComposerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: channels, isLoading: channelsLoading } = useChannels();
  const createPost = useCreatePost();

  const defaultDate = searchParams.get("date") ?? format(addDays(new Date(), 1), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      caption: "",
      hashtags: "",
      date: defaultDate,
      time: "18:00",
      channelId: "",
      categoryId: "22",
      madeForKids: false,
      altText: "",
      firstComment: "",
    },
  });

  const [selected, setSelected] = useState<PlatformId[]>(["youtube"]);
  const [previewPlatform, setPreviewPlatform] = useState<PlatformId>("youtube");
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);

  const values = watch();
  const activeChannels = channels?.[previewPlatform] ?? [];

  // Default the channel once channels load or platform changes.
  useEffect(() => {
    if (activeChannels.length > 0) {
      // Only set if we haven't selected a valid one for this platform
      if (!values.channelId || !activeChannels.find(c => c.id === values.channelId)) {
        setValue("channelId", activeChannels[0].id);
      }
    } else {
      setValue("channelId", "");
    }
  }, [activeChannels, values.channelId, setValue, previewPlatform]);

  useEffect(() => {
    if (!video) return setVideoUrl(null);
    const url = URL.createObjectURL(video);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

  useEffect(() => {
    if (!thumb) return setThumbUrl(null);
    const url = URL.createObjectURL(thumb);
    setThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [thumb]);

  const captionLen = (values.caption + (values.hashtags ? "\n\n" + values.hashtags : "")).length;
  const maxChars = PLATFORMS[previewPlatform].maxChars;
  const overLimit = maxChars !== null && captionLen > maxChars;

  const previewData: PreviewData = useMemo(
    () => ({
      title: values.title,
      caption: values.caption,
      hashtags: values.hashtags,
      mediaUrl: videoUrl,
      mediaIsVideo: true,
      thumbUrl,
      channelName: activeChannels.find((c) => c.id === values.channelId)?.name ?? "RawCast Studio",
    }),
    [values.title, values.caption, values.hashtags, videoUrl, thumbUrl, activeChannels, values.channelId],
  );

  const runAi = (kind: "write" | "improve" | "hashtags") => {
    setAiBusy(kind);
    window.setTimeout(() => {
      if (kind === "write") {
        setValue("caption", AI_CAPTIONS[Math.floor(Math.random() * AI_CAPTIONS.length)]);
      } else if (kind === "improve") {
        const current = values.caption.trim();
        setValue(
          "caption",
          current
            ? current.replace(/\.$/, "") + " — full breakdown in the video. Which setup should I test next?"
            : AI_CAPTIONS[0],
        );
      } else {
        setValue("hashtags", "#filmmaking #cinematography #studiosetup #colorgrade #creatorworkflow");
      }
      setAiBusy(null);
      toast.success(
        kind === "hashtags" ? "Hashtags suggested" : kind === "write" ? "Caption drafted" : "Caption improved",
        { description: "AI suggestions are simulated in this preview build." },
      );
    }, 850);
  };

  const onSchedule = handleSubmit((form) => {
    if (!video) {
      toast.error("Add a video file", { description: "YouTube posts need a video to upload." });
      return;
    }
    if (!form.channelId) {
      toast.error("Connect a YouTube channel first", {
        description: "Open Settings → Channels to connect via Google.",
      });
      return;
    }
    createPost.mutate(
      {
        title: form.title,
        caption: [form.caption, form.hashtags].filter(Boolean).join("\n\n"),
        date: form.date,
        time: form.time,
        channelId: form.channelId,
        tags: form.hashtags.replaceAll("#", "").split(/\s+/).filter(Boolean).join(","),
        madeForKids: form.madeForKids,
        categoryId: form.categoryId,
        video,
        thumbnail: thumb,
      },
      {
        onSuccess: () => {
          toast.success("Scheduled 🎉", {
            description: `Uploads privately now, goes live ${format(new Date(form.date + "T" + form.time), "EEE, MMM d 'at' h:mm a")}.`,
          });
          router.push("/calendar");
        },
        onError: (err) =>
          toast.error("Couldn't schedule", {
            description: err instanceof Error ? err.message : "Backend rejected the post.",
          }),
      },
    );
  });

  const saveDraft = () => {
    window.localStorage.setItem("rc.draft", JSON.stringify({ ...values, saved: Date.now() }));
    toast.success("Draft saved", { description: "Stored locally — pick it up anytime." });
  };

  return (
    <Page wide className="pb-24">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ------------------------------------------------ Left: form */}
        <div className="space-y-5">
          {/* Platform selector */}
          <section aria-label="Platforms">
            <Label className="mb-2 block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Publish to
            </Label>
            <div className="flex flex-wrap gap-2">
              {PREVIEWABLE.map((p) => {
                const meta = PLATFORMS[p];
                const active = selected.includes(p);
                const available = ["youtube", "tiktok", "facebook", "instagram"].includes(p);
                return (
                  <Tooltip key={p}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (!available) {
                            toast.info(`${meta.name} isn't connected yet`, {
                              description: "Preview still works — connect it in Settings when the integration ships.",
                            });
                            setPreviewPlatform(p);
                            return;
                          }
                          setSelected((s) => (active ? s.filter((x) => x !== p) : [...s, p]));
                          setPreviewPlatform(p);
                        }}
                        aria-pressed={active}
                        className={cn(
                          "flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-all duration-200",
                          active
                            ? "border-brand bg-brand/15 text-foreground elevation-1 ring-1 ring-brand/50 shadow-sm shadow-brand/20"
                            : "border-border/60 bg-card text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground",
                          !available && !active && "opacity-55",
                        )}
                      >
                        <PlatformIcon platform={p} colored={!active} className="size-3.5" />
                        {meta.name}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {available ? (active ? "Publishing here" : "Click to include") : "Integration coming soon — preview only"}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </section>

          {/* Channel + title */}
          <div className="grid gap-4 rounded-xl border border-border/60 bg-card glass-card p-4 elevation-1 transition-all duration-300 hover:elevation-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="channel" className="mb-1.5 block text-[12.5px]">
                  {PLATFORMS[previewPlatform]?.name ?? "Platform"} account
                </Label>
                {channelsLoading ? (
                  <Skeleton className="h-9 w-full rounded-lg" />
                ) : activeChannels.length === 0 ? (
                  <Button variant="outline" size="sm" className="h-9 w-full justify-start gap-2" asChild>
                    <a href={previewPlatform === "youtube" ? api.youtubeAuthUrl : previewPlatform === "tiktok" ? api.tiktokAuthUrl : previewPlatform === "instagram" ? api.instagramAuthUrl : api.facebookAuthUrl} target="_blank" rel="noreferrer">
                      <PlatformIcon platform={previewPlatform} className="size-4" /> Connect {PLATFORMS[previewPlatform]?.name}…
                    </a>
                  </Button>
                ) : (
                  <Select value={values.channelId} onValueChange={(v) => setValue("channelId", v)}>
                    <SelectTrigger id="channel" className="w-full">
                      <SelectValue placeholder="Choose account" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeChannels.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label htmlFor="category" className="mb-1.5 block text-[12.5px]">
                  Category
                </Label>
                <Select value={values.categoryId} onValueChange={(v) => setValue("categoryId", v)}>
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="title" className="mb-1.5 block text-[12.5px]">
                Title <span aria-hidden className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Give this post a title people can't scroll past"
                aria-invalid={!!errors.title}
                {...register("title", { required: "A title is required", maxLength: { value: 100, message: "YouTube titles max out at 100 characters" } })}
              />
              {errors.title && (
                <p role="alert" className="mt-1.5 flex items-center gap-1 text-[12px] text-destructive">
                  <CircleAlert className="size-3.5" /> {errors.title.message}
                </p>
              )}
            </div>

            {/* Caption with AI toolbar */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label htmlFor="caption" className="text-[12.5px]">
                  Caption
                </Label>
                <span
                  className={cn("text-[11.5px] tnum", overLimit ? "font-semibold text-destructive" : "text-muted-foreground")}
                  aria-live="polite"
                >
                  {captionLen}
                  {maxChars !== null && ` / ${maxChars.toLocaleString()}`}
                </span>
              </div>
              <Textarea
                id="caption"
                rows={5}
                placeholder="What's the story behind this one?"
                className="resize-y text-[13.5px] leading-relaxed"
                {...register("caption")}
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-[12px]" disabled={aiBusy !== null} onClick={() => runAi("write")}>
                  {aiBusy === "write" ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3 text-brand" />}
                  Write for me
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-[12px]" disabled={aiBusy !== null} onClick={() => runAi("improve")}>
                  {aiBusy === "improve" ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3 text-brand" />}
                  Improve
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-[12px]" disabled={aiBusy !== null} onClick={() => runAi("hashtags")}>
                  {aiBusy === "hashtags" ? <Loader2 className="size-3 animate-spin" /> : <span className="text-brand">#</span>}
                  Hashtags
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-[12px]" aria-label="Insert emoji">
                      <Smile className="size-3.5" /> Emoji
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="grid grid-cols-8 gap-0.5">
                      {EMOJI.map((e) => (
                        <button
                          key={e}
                          className="grid size-7 place-items-center rounded-md text-[16px] transition-colors hover:bg-accent"
                          onClick={() => setValue("caption", values.caption + e)}
                          aria-label={`Insert ${e}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label htmlFor="hashtags" className="mb-1.5 block text-[12.5px]">
                Hashtags
              </Label>
              <Input id="hashtags" placeholder="#filmmaking #studiosetup" className="font-mono text-[12.5px]" {...register("hashtags")} />
            </div>
          </div>

          {/* Media */}
          <div className="rounded-xl border border-border/60 bg-card glass-card p-4 elevation-1 transition-all duration-300 hover:elevation-2">
            <Label className="mb-2.5 block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Media
            </Label>
            {video ? (
              <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/40 p-2.5">
                {videoUrl && (
                  <video src={videoUrl} muted playsInline className="h-14 w-24 rounded-md object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{video.name}</p>
                  <p className="text-[11.5px] text-muted-foreground tnum">
                    {(video.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label="Remove video" onClick={() => setVideo(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoInput.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f?.type.startsWith("video/")) setVideo(f);
                  else toast.error("Drop a video file");
                }}
                className={cn(
                  "flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-8 transition-colors",
                  dragOver ? "border-brand bg-brand-muted/50" : "border-border hover:border-ring hover:bg-accent/50",
                )}
              >
                <Upload className="size-5 text-muted-foreground" strokeWidth={1.6} />
                <span className="text-[13px] font-medium">Drop a video, or click to browse</span>
                <span className="text-[11.5px] text-muted-foreground">MP4, MOV — uploads privately, publishes on schedule</span>
              </button>
            )}
            <input
              ref={videoInput}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
            />

            <div className="mt-3 flex items-center gap-3">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => thumbInput.current?.click()}>
                <ImagePlus className="size-3.5" />
                {thumb ? "Replace thumbnail" : "Add thumbnail"}
              </Button>
              {thumb && (
                <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span className="truncate max-w-40">{thumb.name}</span>
                  <button aria-label="Remove thumbnail" onClick={() => setThumb(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="size-3.5" />
                  </button>
                </span>
              )}
              <input
                ref={thumbInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setThumb(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="alt" className="mb-1.5 block text-[12.5px]">Alt text</Label>
                <Input id="alt" placeholder="Describe the media for screen readers" {...register("altText")} />
              </div>
              <div>
                <Label htmlFor="firstComment" className="mb-1.5 block text-[12.5px]">
                  First comment <span className="text-[11px] text-muted-foreground">(IG/LinkedIn)</span>
                </Label>
                <Input id="firstComment" placeholder="Drop links & extra hashtags here" {...register("firstComment")} />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-xl border border-border/60 bg-card glass-card p-4 elevation-1 transition-all duration-300 hover:elevation-2">
            <Label className="mb-2.5 block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Schedule
            </Label>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="date" className="mb-1.5 block text-[12.5px]">Date</Label>
                <Input id="date" type="date" aria-invalid={!!errors.date} {...register("date", { required: true })} />
              </div>
              <div>
                <Label htmlFor="time" className="mb-1.5 block text-[12.5px]">Time</Label>
                <Input id="time" type="time" aria-invalid={!!errors.time} {...register("time", { required: true })} />
              </div>
              <div className="flex items-end justify-between gap-3 pb-1">
                <Label htmlFor="kids" className="text-[12.5px] leading-snug">Made for kids</Label>
                <Switch id="kids" checked={values.madeForKids} onCheckedChange={(v) => setValue("madeForKids", v)} />
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <CalendarClock className="size-3.5" />
              Uploads to YouTube as private immediately; YouTube flips it public at the scheduled time.
            </p>
          </div>
        </div>

        {/* ------------------------------------------------ Right: preview */}
        <aside className="lg:sticky lg:top-6 lg:self-start" aria-label="Live preview">
          <div className="mb-3 flex flex-wrap gap-1 rounded-lg border border-border/60 bg-card glass-card p-1 elevation-1">
            {PREVIEWABLE.map((p) => (
              <button
                key={p}
                onClick={() => setPreviewPlatform(p)}
                aria-pressed={previewPlatform === p}
                aria-label={`Preview on ${PLATFORMS[p].name}`}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-[12px] font-medium transition-colors",
                  previewPlatform === p ? "bg-accent text-foreground elevation-1" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <PlatformIcon platform={p} colored={previewPlatform === p} className="size-3.5" />
              </button>
            ))}
          </div>
          <PlatformPreview platform={previewPlatform} data={previewData} />
        </aside>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 md:left-16 lg:left-[232px] xl:right-72">
        <div className="glass mx-auto flex max-w-[1400px] items-center gap-2 border-t border-border/70 px-4 py-3 md:px-8">
          <p className="hidden text-[12px] text-muted-foreground sm:block">
            {video ? video.name : "No media yet"} · {format(new Date(values.date + "T" + (values.time || "18:00")), "EEE, MMM d · h:mm a")}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={saveDraft}>
              <Save className="size-3.5" /> Save draft
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info("Queue slots coming soon", { description: "For now, pick an exact date and time." })}>
              Add to queue
            </Button>
            <Button size="sm" className="gap-1.5 px-4" onClick={onSchedule} disabled={createPost.isPending || overLimit}>
              {createPost.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <CalendarClock className="size-3.5" /> Schedule
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Page>
  );
}

export default function ComposerPage() {
  return (
    <Suspense fallback={<Page wide><Skeleton className="h-[600px] w-full rounded-xl" /></Page>}>
      <ComposerForm />
    </Suspense>
  );
}
