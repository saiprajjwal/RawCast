"use client";

import { Mail, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { teamMembers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const ROLES = ["Owner", "Admin", "Editor", "Analyst", "Viewer"];

export default function TeamPage() {
  return (
    <Page>
      <PageHeader
        title="Team"
        description="Who can plan, publish and analyze in this workspace."
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() =>
              toast.info("Invites coming soon", {
                description: "Team collaboration ships with the multi-user backend.",
              })
            }
          >
            <UserPlus className="size-3.5" /> Invite member
          </Button>
        }
      />

      <div className="space-y-2.5">
        {teamMembers.map((m) => (
          <Card key={m.id} className="py-0">
            <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <span className="relative">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-brand-muted text-[13px] font-semibold">
                    {m.initials}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card",
                    m.online ? "bg-success" : "bg-muted-foreground/40",
                  )}
                  aria-label={m.online ? "Online" : "Offline"}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13.5px] font-medium">
                  {m.name}
                  {m.role === "Owner" && (
                    <Badge variant="secondary" className="gap-1 text-[10.5px]">
                      <ShieldCheck className="size-3" /> Owner
                    </Badge>
                  )}
                </p>
                <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Mail className="size-3" /> {m.email}
                </p>
              </div>
              <Select defaultValue={m.role} disabled={m.role === "Owner"}>
                <SelectTrigger size="sm" className="w-28 text-[12.5px]" aria-label={`Role for ${m.name}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
        Roles preview what's coming: <span className="font-medium text-foreground">Editors</span> draft and schedule,{" "}
        <span className="font-medium text-foreground">Admins</span> manage channels, and{" "}
        <span className="font-medium text-foreground">Analysts</span> get read-only analytics. Approval workflows land
        alongside the multi-user backend.
      </p>
    </Page>
  );
}
