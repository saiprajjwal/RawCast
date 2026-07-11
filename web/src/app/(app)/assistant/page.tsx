"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  Clock,
  Hash,
  Languages,
  Lightbulb,
  Loader2,
  MessageSquareQuote,
  Recycle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CAPABILITIES = [
  { icon: MessageSquareQuote, label: "Write a caption", prompt: "Write a caption for my studio rebuild video" },
  { icon: Hash, label: "Suggest hashtags", prompt: "Suggest hashtags for a color grading tutorial" },
  { icon: Clock, label: "Best time to post", prompt: "When should I post this week for maximum reach?" },
  { icon: Recycle, label: "Repurpose a post", prompt: "Turn my last YouTube video into a Twitter thread" },
  { icon: Lightbulb, label: "Content ideas", prompt: "Give me 5 video ideas for filmmakers this month" },
  { icon: Languages, label: "Translate", prompt: "Translate my latest caption to Spanish" },
  { icon: TrendingUp, label: "Boost engagement", prompt: "How can I improve engagement on my shorts?" },
];

interface Message {
  role: "user" | "assistant";
  text: string;
}

const CANNED: Record<string, string> = {
  caption:
    "Here's a caption draft:\n\n“Three weeks. One studio, rebuilt from the bare walls up. New lighting rig, proper acoustic treatment, and a color pipeline that finally gets out of the way. Full breakdown — including the two mistakes that cost me a weekend — in the new video.”\n\nWant it punchier, longer, or with a stronger hook?",
  hashtag:
    "For a color grading tutorial, I'd combine reach + niche tags:\n\n#colorgrading #davinciresolve #filmmaking #cinematography #colorist #videoediting #filmlook #gradingtutorial\n\nSkip #viral-style tags — they attract the wrong audience for tutorials.",
  time:
    "Based on your recent engagement pattern, your audience is most active **Thu 5–7 PM** and **Sun 10 AM–12 PM**. Your next best slots this week: Thursday 6 PM (video) and Sunday 11 AM (short). Want me to draft the schedule?",
  default:
    "Here are 5 video ideas tuned to your channel:\n\n1. “I graded the same shot 5 ways” — side-by-side looks\n2. Studio audio treatment on a $200 budget\n3. Raw vs. log vs. compressed: can you tell?\n4. My render settings, explained in 4 minutes\n5. One week of shorts from a single shoot day\n\nWant a script outline for any of these?",
};

function replyFor(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("caption")) return CANNED.caption;
  if (t.includes("hashtag")) return CANNED.hashtag;
  if (t.includes("time") || t.includes("when")) return CANNED.time;
  return CANNED.default;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setBusy(true);
    window.setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", text: replyFor(trimmed) }]);
      setBusy(false);
      requestAnimationFrame(() =>
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }),
      );
    }, 900);
    requestAnimationFrame(() =>
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }),
    );
  };

  return (
    <Page className="flex h-full max-w-3xl flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand/70 text-brand-foreground elevation-2"
          >
            <Sparkles className="size-6" />
          </motion.span>
          <h2 className="text-xl font-semibold tracking-[-0.015em]">What should we make today?</h2>
          <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
            Captions, hashtags, posting times, content ideas — ask anything about your content.
            Responses are simulated until the AI backend ships.
          </p>
          <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
            {CAPABILITIES.map((c) => (
              <button
                key={c.label}
                onClick={() => send(c.prompt)}
                className="flex h-9 items-center gap-2 rounded-full border border-border/80 bg-card px-3.5 text-[12.5px] font-medium text-foreground/80 transition-all hover:border-brand/40 hover:bg-brand-muted/40 hover:text-foreground"
              >
                <c.icon className="size-3.5 text-brand" strokeWidth={1.8} />
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto pb-6 scrollbar-thin" aria-live="polite">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed",
                  m.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border border-border/70 bg-card elevation-1",
                )}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Thinking…
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-4 mt-auto">
        <div className="relative rounded-2xl border border-border/80 bg-card elevation-2 focus-within:border-ring">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            placeholder="Ask the assistant… (Enter to send)"
            aria-label="Message the AI assistant"
            className="resize-none border-0 bg-transparent pr-12 text-[13.5px] shadow-none focus-visible:ring-0"
          />
          <Button
            size="icon-sm"
            aria-label="Send message"
            disabled={!input.trim() || busy}
            onClick={() => send(input)}
            className="absolute bottom-2.5 right-2.5 rounded-full"
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    </Page>
  );
}
