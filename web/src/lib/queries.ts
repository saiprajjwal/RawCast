"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type ApiPost, type CreatePostInput } from "@/lib/api";

export function useChannels() {
  return useQuery({ queryKey: ["channels"], queryFn: api.getChannels });
}

export function usePosts() {
  return useQuery({ queryKey: ["posts"], queryFn: api.getPosts });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePostInput) => api.createPost(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useReschedulePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      date,
      time,
    }: {
      id: string;
      date: string;
      time?: string;
    }) => api.updatePost(id, { date, ...(time ? { time } : {}) }),
    // Optimistic move — the calendar chip lands immediately.
    onMutate: async ({ id, date, time }) => {
      await qc.cancelQueries({ queryKey: ["posts"] });
      const previous = qc.getQueryData<ApiPost[]>(["posts"]);
      qc.setQueryData<ApiPost[]>(["posts"], (old) =>
        old?.map((p) =>
          p.id === id ? { ...p, date, time: time ?? p.time } : p,
        ),
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["posts"], ctx.previous);
      toast.error("Couldn't reschedule", {
        description:
          err instanceof Error ? err.message : "The backend rejected the change.",
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePost(id),
    // Optimistic removal — the calendar/queue reflect the delete instantly.
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["posts"] });
      const previous = qc.getQueryData<ApiPost[]>(["posts"]);
      qc.setQueryData<ApiPost[]>(["posts"], (old) =>
        old?.filter((p) => p.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["posts"], ctx.previous);
      toast.error("Couldn't delete the post", {
        description: "The backend rejected the request. Try again.",
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useRenameChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.renameChannel(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      toast.success("Channel renamed");
    },
    onError: () => toast.error("Couldn't rename the channel"),
  });
}
