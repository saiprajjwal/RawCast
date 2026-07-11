"use client";

import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { CalendarPlus, CircleAlert, CircleCheck, Clock3, ListOrdered, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Page, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePosts, useDeletePost } from "@/lib/queries";
import type { ApiPost } from "@/lib/api";
import { PLATFORMS, PlatformIcon, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";

function Row({ post }: { post: ApiPost }) {
  const platform = (post.selections[0]?.split(":")[0] ?? "youtube") as PlatformId;
  const deletePost = useDeletePost();

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/80 bg-card px-3.5 py-3 elevation-1 transition-shadow hover:elevation-2">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-lg"
        style={{ background: `color-mix(in oklch, ${PLATFORMS[platform].color} 10%, transparent)` }}
      >
        <PlatformIcon platform={platform} colored className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium">{post.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground tnum">
          <Clock3 className="size-3" />
          {format(parseISO(post.date), "EEE, MMM d")} · {post.time}
        </p>
      </div>
      <Badge
        className={cn(
          "border-0 font-medium",
          post.status === "uploaded" && "bg-success/12 text-success",
          post.status === "pending" && "bg-brand-muted text-foreground",
          post.status === "failed" && "bg-destructive/12 text-destructive",
        )}
      >
        {post.status === "uploaded" ? (
          <><CircleCheck className="size-3" /> Published</>
        ) : post.status === "pending" ? (
          <><Clock3 className="size-3" /> Scheduled</>
        ) : (
          <><CircleAlert className="size-3" /> Failed</>
        )}
      </Badge>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${post.title}`}
        className="text-muted-foreground hover:text-destructive"
        onClick={() =>
          deletePost.mutate(post.id, { onSuccess: () => toast.success("Post removed") })
        }
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

export default function QueuePage() {
  const { data: posts, isLoading } = usePosts();
  const router = useRouter();

  const groups: [string, ApiPost[]][] = [
    ["Scheduled", (posts ?? []).filter((p) => p.status === "pending")],
    ["Published", (posts ?? []).filter((p) => p.status === "uploaded")],
    ["Needs attention", (posts ?? []).filter((p) => p.status === "failed")],
  ];

  return (
    <Page>
      <PageHeader
        title="Queue"
        description="Everything moving through the pipeline, in publish order."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => router.push("/composer")}>
            <CalendarPlus className="size-3.5" /> Schedule a post
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (posts ?? []).length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="Your queue is empty"
          description="Posts you schedule land here and publish automatically — even while you sleep."
          action={
            <Button size="sm" onClick={() => router.push("/composer")}>
              Create your first post
            </Button>
          }
        />
      ) : (
        groups.map(([label, items]) =>
          items.length === 0 ? null : (
            <section key={label} className="mb-6">
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                {label} <span className="tnum">({items.length})</span>
              </h3>
              <ul className="space-y-2">
                {items.map((p) => (
                  <Row key={p.id} post={p} />
                ))}
              </ul>
            </section>
          ),
        )
      )}
    </Page>
  );
}
