import type { PlatformId } from "@/lib/platforms";

/* Mock data for surfaces the Express backend doesn't serve yet
   (analytics, AI, team, media, notifications). Everything calendar/
   queue/channel related comes from the real API. */

export interface MetricPoint {
  date: string;
  reach: number;
  impressions: number;
  clicks: number;
  engagement: number;
  followers: number;
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function weeklyPerformance(days = 28): MetricPoint[] {
  const rand = seeded(7);
  const out: MetricPoint[] = [];
  const today = new Date();
  let followers = 12480;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const wave = 1 + 0.35 * Math.sin((days - i) / 3.2);
    const reach = Math.round((3200 + rand() * 2400) * wave);
    followers += Math.round(rand() * 60 - 8);
    out.push({
      date: d.toISOString().slice(0, 10),
      reach,
      impressions: Math.round(reach * (1.6 + rand() * 0.5)),
      clicks: Math.round(reach * (0.04 + rand() * 0.03)),
      engagement: Math.round(reach * (0.08 + rand() * 0.05)),
      followers,
    });
  }
  return out;
}

export const platformStats: {
  platform: PlatformId;
  followers: number;
  reach: number;
  engagementRate: number;
  delta: number;
}[] = [
  { platform: "youtube", followers: 12840, reach: 96400, engagementRate: 6.4, delta: 12.6 },
  { platform: "instagram", followers: 8210, reach: 41200, engagementRate: 4.1, delta: 3.2 },
  { platform: "x", followers: 3480, reach: 18800, engagementRate: 2.2, delta: -1.4 },
  { platform: "linkedin", followers: 1960, reach: 9400, engagementRate: 5.6, delta: 7.8 },
  { platform: "tiktok", followers: 15220, reach: 188000, engagementRate: 9.8, delta: 22.4 },
];

export const topPosts = [
  { id: "tp1", title: "Behind the scenes: studio rebuild", platform: "youtube" as PlatformId, reach: 48200, engagement: 9.2, clicks: 2140, published: "2026-07-02" },
  { id: "tp2", title: "5 lighting setups under $100", platform: "tiktok" as PlatformId, reach: 92400, engagement: 12.8, clicks: 1180, published: "2026-06-28" },
  { id: "tp3", title: "Color grading masterclass teaser", platform: "instagram" as PlatformId, reach: 21400, engagement: 6.7, clicks: 860, published: "2026-07-05" },
  { id: "tp4", title: "Why raw footage beats presets", platform: "youtube" as PlatformId, reach: 18700, engagement: 5.4, clicks: 640, published: "2026-06-24" },
  { id: "tp5", title: "My full camera bag, itemized", platform: "x" as PlatformId, reach: 9600, engagement: 3.1, clicks: 420, published: "2026-07-01" },
];

/** Engagement heat by weekday/hour — drives "best time to post". */
export function bestTimes(): { day: number; hour: number; value: number }[] {
  const rand = seeded(23);
  const out: { day: number; hour: number; value: number }[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 6; hour <= 22; hour += 2) {
      const evening = hour >= 17 && hour <= 21 ? 0.45 : 0;
      const midweek = day >= 2 && day <= 4 ? 0.2 : 0;
      out.push({ day, hour, value: Math.min(1, rand() * 0.45 + evening + midweek) });
    }
  }
  return out;
}

export const aiSuggestions = [
  {
    id: "ai1",
    kind: "timing",
    title: "Shift Thursday's post to 6 PM",
    body: "Your audience engagement peaks Thu 5–7 PM. Moving “Color grading pt. 2” could lift reach ~18%.",
  },
  {
    id: "ai2",
    kind: "content",
    title: "Repurpose your top short",
    body: "“5 lighting setups” outperformed by 4×. A 60-second cut would fit Instagram Reels and TikTok.",
  },
  {
    id: "ai3",
    kind: "hashtag",
    title: "Refresh your hashtag set",
    body: "#filmmaking is saturated this week. #cinematography and #colorgrade are trending in your niche.",
  },
];

export const drafts = [
  { id: "d1", title: "Color grading masterclass pt. 2", updated: "2026-07-09", platforms: ["youtube"] as PlatformId[] },
  { id: "d2", title: "Studio tour — final reveal", updated: "2026-07-08", platforms: ["youtube", "instagram"] as PlatformId[] },
  { id: "d3", title: "Q&A: your editing questions", updated: "2026-07-06", platforms: ["x"] as PlatformId[] },
];

export interface MediaAsset {
  id: string;
  name: string;
  type: "video" | "image";
  duration?: string;
  size: string;
  tags: string[];
  folder: string;
  favorite: boolean;
  added: string;
  /** aspect ratio used to draw the placeholder tile */
  ratio: number;
  hue: number;
}

export const mediaAssets: MediaAsset[] = [
  { id: "m1", name: "studio-rebuild-final.mp4", type: "video", duration: "12:41", size: "1.2 GB", tags: ["studio", "vlog"], folder: "Vlogs", favorite: true, added: "2026-07-08", ratio: 16 / 9, hue: 36 },
  { id: "m2", name: "lighting-b-roll-02.mp4", type: "video", duration: "0:47", size: "210 MB", tags: ["b-roll", "lighting"], folder: "B-roll", favorite: false, added: "2026-07-07", ratio: 16 / 9, hue: 210 },
  { id: "m3", name: "thumb-grading-v3.png", type: "image", size: "2.4 MB", tags: ["thumbnail"], folder: "Thumbnails", favorite: true, added: "2026-07-07", ratio: 16 / 9, hue: 280 },
  { id: "m4", name: "reel-cut-lighting.mp4", type: "video", duration: "0:58", size: "98 MB", tags: ["reel", "lighting"], folder: "Shorts", favorite: false, added: "2026-07-05", ratio: 9 / 16, hue: 160 },
  { id: "m5", name: "brand-logo-dark.svg", type: "image", size: "18 KB", tags: ["brand"], folder: "Brand", favorite: true, added: "2026-06-30", ratio: 1, hue: 40 },
  { id: "m6", name: "qa-teaser.mp4", type: "video", duration: "1:32", size: "260 MB", tags: ["teaser"], folder: "Shorts", favorite: false, added: "2026-07-01", ratio: 9 / 16, hue: 350 },
  { id: "m7", name: "desk-setup-hero.jpg", type: "image", size: "6.8 MB", tags: ["studio", "photo"], folder: "Photos", favorite: false, added: "2026-06-28", ratio: 3 / 2, hue: 90 },
  { id: "m8", name: "colorgrade-before-after.mp4", type: "video", duration: "0:22", size: "64 MB", tags: ["b-roll", "grading"], folder: "B-roll", favorite: false, added: "2026-06-26", ratio: 16 / 9, hue: 250 },
  { id: "m9", name: "thumb-studio-v1.png", type: "image", size: "1.9 MB", tags: ["thumbnail"], folder: "Thumbnails", favorite: false, added: "2026-06-25", ratio: 16 / 9, hue: 15 },
  { id: "m10", name: "camera-bag-flatlay.jpg", type: "image", size: "4.2 MB", tags: ["photo", "gear"], folder: "Photos", favorite: true, added: "2026-06-22", ratio: 4 / 5, hue: 120 },
  { id: "m11", name: "intro-sting-v4.mp4", type: "video", duration: "0:06", size: "22 MB", tags: ["brand", "motion"], folder: "Brand", favorite: false, added: "2026-06-20", ratio: 16 / 9, hue: 60 },
  { id: "m12", name: "grade-node-tree.png", type: "image", size: "3.1 MB", tags: ["tutorial"], folder: "Thumbnails", favorite: false, added: "2026-06-18", ratio: 16 / 10, hue: 190 },
];

export const mediaFolders = ["All", "Vlogs", "Shorts", "B-roll", "Thumbnails", "Photos", "Brand"];

export const teamMembers = [
  { id: "u1", name: "Prajjwal Pandey", email: "designer.prajjwal@gmail.com", role: "Owner", initials: "PP", online: true },
  { id: "u2", name: "Pratima Sharma", email: "pratima@rawcast.studio", role: "Editor", initials: "PS", online: true },
  { id: "u3", name: "Alex Rivera", email: "alex@rawcast.studio", role: "Analyst", initials: "AR", online: false },
];

export interface AppNotification {
  id: string;
  group: "publishing" | "mentions" | "team";
  title: string;
  body: string;
  time: string;
  unread: boolean;
  tone: "success" | "error" | "info";
}

export const notifications: AppNotification[] = [
  { id: "n1", group: "publishing", title: "Published to YouTube", body: "“Behind the scenes: studio rebuild” is live.", time: "2h ago", unread: true, tone: "success" },
  { id: "n2", group: "publishing", title: "Upload scheduled", body: "“Color grading pt. 2” will publish Fri 6:00 PM.", time: "5h ago", unread: true, tone: "info" },
  { id: "n3", group: "mentions", title: "New comment spike", body: "48 comments on your studio rebuild video in the last hour.", time: "6h ago", unread: false, tone: "info" },
  { id: "n4", group: "team", title: "Pratima edited a draft", body: "“Studio tour — final reveal” caption updated.", time: "1d ago", unread: false, tone: "info" },
  { id: "n5", group: "publishing", title: "Upload failed", body: "“Q&A teaser” — network interrupted. Tap to retry.", time: "2d ago", unread: false, tone: "error" },
];
