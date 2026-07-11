"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Film,
  FolderOpen,
  Heart,
  ImageIcon,
  Play,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Page, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mediaAssets, mediaFolders, type MediaAsset } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function Tile({ asset, onFavorite }: { asset: MediaAsset; onFavorite: (id: string) => void }) {
  return (
    <motion.figure
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="group relative mb-3 break-inside-avoid overflow-hidden rounded-xl border border-border/70 bg-card elevation-1 transition-shadow hover:elevation-2"
    >
      {/* Placeholder art — real thumbnails come from the uploads dir later */}
      <div
        className="relative w-full"
        style={{
          aspectRatio: asset.ratio,
          background: `linear-gradient(135deg,
            oklch(0.88 0.06 ${asset.hue}) 0%,
            oklch(0.72 0.09 ${asset.hue + 40}) 55%,
            oklch(0.55 0.1 ${asset.hue + 80}) 100%)`,
        }}
      >
        {asset.type === "video" && (
          <>
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-10 place-items-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <Play className="ml-0.5 size-4 fill-current" />
              </span>
            </span>
            <Badge className="absolute bottom-2 right-2 border-0 bg-black/55 font-mono text-[10.5px] text-white tnum backdrop-blur-sm">
              {asset.duration}
            </Badge>
          </>
        )}
        <button
          aria-label={asset.favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={asset.favorite}
          onClick={() => onFavorite(asset.id)}
          className={cn(
            "absolute right-2 top-2 grid size-7 place-items-center rounded-full backdrop-blur-sm transition-all",
            asset.favorite
              ? "bg-white/85 text-rose-500"
              : "bg-black/25 text-white opacity-0 hover:bg-black/40 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Heart className={cn("size-3.5", asset.favorite && "fill-current")} />
        </button>
      </div>
      <figcaption className="flex items-center gap-2 px-2.5 py-2">
        {asset.type === "video" ? (
          <Film className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.7} />
        ) : (
          <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.7} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium">{asset.name}</span>
          <span className="text-[11px] text-muted-foreground tnum">
            {asset.folder} · {asset.size}
          </span>
        </span>
      </figcaption>
    </motion.figure>
  );
}

export default function LibraryPage() {
  const [folder, setFolder] = useState("All");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<{ video: boolean; image: boolean }>({ video: true, image: true });
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState(() => new Set(mediaAssets.filter((a) => a.favorite).map((a) => a.id)));

  const filtered = useMemo(() => {
    return mediaAssets
      .map((a) => ({ ...a, favorite: favorites.has(a.id) }))
      .filter((a) => folder === "All" || a.folder === folder)
      .filter((a) => typeFilter[a.type])
      .filter((a) => !favoritesOnly || a.favorite)
      .filter(
        (a) =>
          !query ||
          a.name.toLowerCase().includes(query.toLowerCase()) ||
          a.tags.some((t) => t.includes(query.toLowerCase())),
      );
  }, [folder, query, typeFilter, favoritesOnly, favorites]);

  const toggleFavorite = (id: string) =>
    setFavorites((f) => {
      const next = new Set(f);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Page wide>
      <PageHeader
        title="Media Library"
        description="Raw footage, thumbnails and brand assets — ready to schedule."
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() =>
              toast.info("Bulk upload coming soon", {
                description: "For now, attach media directly in the Composer.",
              })
            }
          >
            <Upload className="size-3.5" /> Upload
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files and tags…"
            aria-label="Search media"
            className="h-8 w-56 pl-8 text-[13px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Folders">
          {mediaFolders.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={folder === f}
              onClick={() => setFolder(f)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium transition-colors",
                folder === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-border/80 hover:bg-accent hover:text-foreground",
              )}
            >
              {f !== "All" && <FolderOpen className="size-3.5" strokeWidth={1.7} />}
              {f}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant={favoritesOnly ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-[12.5px]"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((v) => !v)}
          >
            <Heart className={cn("size-3.5", favoritesOnly && "fill-current text-rose-500")} /> Favorites
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-[12.5px]">
                <SlidersHorizontal className="size-3.5" /> Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Type</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={typeFilter.video}
                onCheckedChange={(v) => setTypeFilter((t) => ({ ...t, video: !!v }))}
              >
                Videos
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={typeFilter.image}
                onCheckedChange={(v) => setTypeFilter((t) => ({ ...t, image: !!v }))}
              >
                Images
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No matches"
          description="Try a different search, folder, or clear the favorites filter."
          action={
            <Button variant="outline" size="sm" onClick={() => { setQuery(""); setFolder("All"); setFavoritesOnly(false); }}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 xl:columns-4">
          {filtered.map((a) => (
            <Tile key={a.id} asset={a} onFavorite={toggleFavorite} />
          ))}
        </div>
      )}
    </Page>
  );
}
