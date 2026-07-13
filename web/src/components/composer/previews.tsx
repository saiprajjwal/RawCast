"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Repeat2,
  Send,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { PlatformIcon, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";

export interface PreviewData {
  title: string;
  caption: string;
  hashtags: string;
  mediaUrl: string | null;
  mediaIsVideo: boolean;
  thumbUrl: string | null;
  /** photo posts (IG carousel / FB multi-photo) — first photo drives the frame */
  photoUrls?: string[];
  channelName: string;
}

function MediaFrame({
  data,
  className,
  vertical = false,
}: {
  data: PreviewData;
  className?: string;
  vertical?: boolean;
}) {
  const firstPhoto = data.photoUrls?.[0] ?? null;
  const src = firstPhoto ?? data.thumbUrl ?? data.mediaUrl;
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-muted",
        vertical ? "aspect-9/16" : "aspect-video",
        className,
      )}
    >
      {(data.photoUrls?.length ?? 0) > 1 && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur-sm">
          1/{data.photoUrls!.length}
        </span>
      )}
      {src ? (
        data.mediaIsVideo && !data.thumbUrl && !firstPhoto ? (
          <video src={src} muted playsInline className="size-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Post media preview" className="size-full object-cover" />
        )
      ) : (
        <div className="grid size-full place-items-center bg-gradient-to-br from-brand-muted/70 via-muted to-muted">
          <span className="text-[12px] text-muted-foreground">Add media to preview</span>
        </div>
      )}
    </div>
  );
}

const fullCaption = (d: PreviewData) =>
  [d.caption, d.hashtags].filter(Boolean).join("\n\n");

/* --- Per-platform frames ------------------------------------------- */

function YouTubePreview({ data }: { data: PreviewData }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <MediaFrame data={data} />
      <div className="flex gap-3 p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-muted text-[12px] font-semibold">
          {data.channelName.slice(0, 1) || "R"}
        </span>
        <div className="min-w-0">
          <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug">
            {data.title || "Your video title"}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {data.channelName || "Your channel"} · Premieres soon
          </p>
        </div>
      </div>
    </div>
  );
}

function InstagramPreview({ data }: { data: PreviewData }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="flex items-center gap-2.5 p-3">
        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-500 p-[2px]">
          <span className="grid size-full place-items-center rounded-full bg-card text-[11px] font-semibold">
            {data.channelName.slice(0, 1) || "R"}
          </span>
        </span>
        <span className="text-[13px] font-semibold">rawcast.studio</span>
        <MoreHorizontal className="ml-auto size-4 text-muted-foreground" />
      </div>
      <MediaFrame data={data} className="aspect-square" />
      <div className="p-3">
        <div className="mb-2 flex items-center gap-3.5 text-foreground/80">
          <Heart className="size-[19px]" strokeWidth={1.8} />
          <MessageCircle className="size-[19px]" strokeWidth={1.8} />
          <Send className="size-[19px]" strokeWidth={1.8} />
          <Bookmark className="ml-auto size-[19px]" strokeWidth={1.8} />
        </div>
        <p className="line-clamp-3 whitespace-pre-wrap text-[12.5px] leading-relaxed">
          <span className="font-semibold">rawcast.studio</span>{" "}
          {fullCaption(data) || "Your caption will appear here…"}
        </p>
      </div>
    </div>
  );
}

function XPreview({ data }: { data: PreviewData }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3.5">
      <div className="flex gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-[12px] font-semibold text-background">
          {data.channelName.slice(0, 1) || "R"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[13px]">
            <span className="font-bold">RawCast Studio</span>
            <BadgeCheck className="size-3.5 text-sky-500" />
            <span className="text-muted-foreground">@rawcast · now</span>
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] leading-snug">
            {fullCaption(data) || "Your post will appear here…"}
          </p>
          {(data.mediaUrl || data.thumbUrl) && (
            <MediaFrame data={data} className="mt-2.5 rounded-xl border border-border/60" />
          )}
          <div className="mt-2.5 flex max-w-xs items-center justify-between text-muted-foreground">
            <MessageCircle className="size-4" strokeWidth={1.7} />
            <Repeat2 className="size-4" strokeWidth={1.7} />
            <Heart className="size-4" strokeWidth={1.7} />
            <Share2 className="size-4" strokeWidth={1.7} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FacebookPreview({ data }: { data: PreviewData }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="flex items-center gap-2.5 p-3">
        <span className="grid size-9 place-items-center rounded-full bg-blue-600 text-[12px] font-semibold text-white">
          {data.channelName.slice(0, 1) || "R"}
        </span>
        <div>
          <p className="text-[13px] font-semibold">RawCast Studio</p>
          <p className="text-[11px] text-muted-foreground">Just now · 🌐</p>
        </div>
      </div>
      {fullCaption(data) && (
        <p className="whitespace-pre-wrap px-3 pb-2.5 text-[13px] leading-relaxed">{fullCaption(data)}</p>
      )}
      <MediaFrame data={data} />
      <div className="flex items-center justify-around border-t border-border/60 px-3 py-1.5 text-[12px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5"><ThumbsUp className="size-4" strokeWidth={1.7} /> Like</span>
        <span className="flex items-center gap-1.5"><MessageCircle className="size-4" strokeWidth={1.7} /> Comment</span>
        <span className="flex items-center gap-1.5"><Share2 className="size-4" strokeWidth={1.7} /> Share</span>
      </div>
    </div>
  );
}

function LinkedInPreview({ data }: { data: PreviewData }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="flex items-center gap-2.5 p-3">
        <span className="grid size-10 place-items-center rounded-full bg-brand-muted text-[13px] font-semibold">
          {data.channelName.slice(0, 1) || "R"}
        </span>
        <div>
          <p className="text-[13px] font-semibold">RawCast Studio</p>
          <p className="text-[11px] text-muted-foreground">2,412 followers · Now</p>
        </div>
      </div>
      <p className="whitespace-pre-wrap px-3 pb-3 text-[13px] leading-relaxed">
        {fullCaption(data) || "Your post will appear here…"}
      </p>
      <MediaFrame data={data} />
    </div>
  );
}

function TikTokPreview({ data }: { data: PreviewData }) {
  return (
    <div className="relative mx-auto w-56 overflow-hidden rounded-2xl border border-border/70 bg-black">
      <MediaFrame data={data} vertical className="opacity-90" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
        <p className="text-[12px] font-semibold text-white">@rawcast.studio</p>
        <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-white/90">
          {fullCaption(data) || "Your caption here…"}
        </p>
        <p className="mt-1.5 flex items-center gap-1 text-[10.5px] text-white/75">
          <Music2 className="size-3" /> Original sound
        </p>
      </div>
      <div className="absolute bottom-14 right-2 flex flex-col items-center gap-3 text-white">
        <Heart className="size-5" />
        <MessageCircle className="size-5" />
        <Bookmark className="size-5" />
      </div>
    </div>
  );
}

const FRAMES: Record<PlatformId, React.ComponentType<{ data: PreviewData }>> = {
  youtube: YouTubePreview,
  instagram: InstagramPreview,
  x: XPreview,
  facebook: FacebookPreview,
  linkedin: LinkedInPreview,
  tiktok: TikTokPreview,
  pinterest: InstagramPreview,
};

export function PlatformPreview({
  platform,
  data,
}: {
  platform: PlatformId;
  data: PreviewData;
}) {
  const Frame = FRAMES[platform];
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={platform}
        initial={{ opacity: 0, y: 8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.99 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        <Frame data={data} />
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-muted-foreground">
          <PlatformIcon platform={platform} className="size-3" />
          Preview approximates how this post renders on {platform === "x" ? "X" : platform.charAt(0).toUpperCase() + platform.slice(1)}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
