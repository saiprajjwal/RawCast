import type { PlatformId } from "@/lib/platforms";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/* ------------------------------------------------------------------ */
/* Types mirroring the Express backend                                 */
/* ------------------------------------------------------------------ */

export interface Channel {
  id: string;
  name: string;
}

export type ChannelsByPlatform = Partial<Record<PlatformId, Channel[]>>;

export type PostStatus = "pending" | "uploaded" | "failed" | "draft";

export interface ApiPost {
  id: string;
  title: string;
  caption: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: PostStatus;
  selections: string[]; // ["youtube:<channelId>"]
}

export interface CreatePostInput {
  title: string;
  caption: string;
  date: string;
  time: string;
  channelId: string;
  tags: string;
  madeForKids: boolean;
  categoryId: string;
  video: File;
  thumbnail?: File | null;
}

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getChannels: () => request<ChannelsByPlatform>("/channels"),

  renameChannel: (id: string, name: string) =>
    request<Channel>(`/channels/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),

  getPosts: () => request<ApiPost[]>("/posts"),

  createPost: (input: CreatePostInput) => {
    const form = new FormData();
    form.set("title", input.title);
    form.set("caption", input.caption);
    form.set("date", input.date);
    form.set("time", input.time);
    form.set("channelId", input.channelId);
    form.set("tags", input.tags);
    form.set("madeForKids", String(input.madeForKids));
    form.set("categoryId", input.categoryId);
    form.set("video", input.video);
    if (input.thumbnail) form.set("thumbnail", input.thumbnail);
    return request<ApiPost>("/posts", { method: "POST", body: form });
  },

  updatePost: (
    id: string,
    patch: Partial<Pick<ApiPost, "date" | "time" | "title" | "caption">>,
  ) =>
    request<ApiPost>(`/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),

  deletePost: (id: string) =>
    request<void>(`/posts/${id}`, { method: "DELETE" }),

  /** URL that starts the YouTube OAuth flow (opens in a new tab). */
  youtubeAuthUrl: `${API_URL}/auth/youtube`,
};
