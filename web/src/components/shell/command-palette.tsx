"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  PenSquare,
  SunMedium,
  Moon,
  CalendarDays,
  Film,
  Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { NAV_MAIN, NAV_SECONDARY } from "@/components/shell/nav";
import { usePosts } from "@/lib/queries";
import { mediaAssets, teamMembers } from "@/lib/mock-data";
import { PlatformIcon, type PlatformId } from "@/lib/platforms";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { data: posts } = usePosts();

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search posts, media, people and actions"
      showCloseButton={false}
    >
      <CommandInput placeholder="Search posts, media, people… or type a command" />
      <CommandList className="scrollbar-thin">
        <CommandEmpty>No results. Try a different search.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/composer")}>
            <PenSquare /> New post
            <CommandShortcut>c</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
              onOpenChange(false);
            }}
          >
            {resolvedTheme === "dark" ? <SunMedium /> : <Moon />}
            Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Go to">
          {[...NAV_MAIN, ...NAV_SECONDARY].map((item) => (
            <CommandItem key={item.href} onSelect={() => go(item.href)}>
              <item.icon /> {item.label}
              {item.goKey && <CommandShortcut>g {item.goKey}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        {posts && posts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Scheduled posts">
              {posts.slice(0, 6).map((post) => {
                const platform = (post.selections[0]?.split(":")[0] ?? "youtube") as PlatformId;
                return (
                  <CommandItem
                    key={post.id}
                    value={`post ${post.title}`}
                    onSelect={() => go("/calendar")}
                  >
                    <CalendarDays />
                    <span className="truncate">{post.title}</span>
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                      <PlatformIcon platform={platform} className="size-3" />
                      {post.date}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Media">
          {mediaAssets.slice(0, 4).map((asset) => (
            <CommandItem
              key={asset.id}
              value={`media ${asset.name} ${asset.tags.join(" ")}`}
              onSelect={() => go("/library")}
            >
              <Film />
              <span className="truncate">{asset.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{asset.folder}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="People">
          {teamMembers.map((member) => (
            <CommandItem
              key={member.id}
              value={`person ${member.name}`}
              onSelect={() => go("/team")}
            >
              <Users />
              {member.name}
              <span className="ml-auto text-xs text-muted-foreground">{member.role}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
