import {
  siYoutube,
  siInstagram,
  siFacebook,
  siTiktok,
  siX,
  siPinterest,
} from "simple-icons";
import { cn } from "@/lib/utils";

export type PlatformId =
  | "youtube"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "x"
  | "pinterest";

// simple-icons dropped LinkedIn for trademark reasons; classic glyph path kept locally.
const LINKEDIN_PATH =
  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z";

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  /** Brand color, adjusted where the true brand color fails on our surfaces */
  color: string;
  /** Color safe on dark surfaces */
  colorDark: string;
  path: string;
  maxChars: number | null;
  connected: boolean;
}

export const PLATFORMS: Record<PlatformId, PlatformMeta> = {
  youtube: {
    id: "youtube",
    name: "YouTube",
    color: "#DB2827",
    colorDark: "#FF4E45",
    path: siYoutube.path,
    maxChars: 5000,
    connected: true,
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    color: "#D6246E",
    colorDark: "#FF5E9E",
    path: siInstagram.path,
    maxChars: 2200,
    connected: false,
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    color: "#0866FF",
    colorDark: "#5AA0FF",
    path: siFacebook.path,
    maxChars: 63206,
    connected: false,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    color: "#171717",
    colorDark: "#F5F5F5",
    path: siTiktok.path,
    maxChars: 2200,
    connected: false,
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0A66C2",
    colorDark: "#59A2E8",
    path: LINKEDIN_PATH,
    maxChars: 3000,
    connected: false,
  },
  x: {
    id: "x",
    name: "X",
    color: "#171717",
    colorDark: "#F5F5F5",
    path: siX.path,
    maxChars: 280,
    connected: false,
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    color: "#BD081C",
    colorDark: "#F5546A",
    path: siPinterest.path,
    maxChars: 500,
    connected: false,
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);

export function PlatformIcon({
  platform,
  className,
  colored = false,
}: {
  platform: PlatformId;
  className?: string;
  colored?: boolean;
}) {
  const meta = PLATFORMS[platform];
  if (!meta) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={meta.name}
      className={cn("size-4 shrink-0", className)}
      style={
        colored
          ? ({
              // Per-theme brand color via CSS var trick handled by callers; default light color
              color: meta.color,
            } as React.CSSProperties)
          : undefined
      }
      fill="currentColor"
    >
      <path d={meta.path} />
    </svg>
  );
}
