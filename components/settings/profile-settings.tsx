"use client";

import { useState } from "react";
import type { UserProfile } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileSettingsProps {
  profile: UserProfile;
}

export function ProfileSettings({ profile }: ProfileSettingsProps) {
  const [name, setName] = useState(profile.name === "No name set" ? "" : profile.name);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setStatus("idle");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim() },
      });

      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
      } else {
        setStatus("saved");
      }
    } catch (err) {
      setErrorMsg("Unexpected error. Please try again.");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const initials = name.trim()
    ? name.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : profile.avatarInitials;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Manage your personal account details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted text-lg font-semibold">
            {initials || "??"}
          </span>
          <div>
            <p className="font-medium">{name.trim() || "No name set"}</p>
            <p className="text-sm text-muted-foreground">{profile.role}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <article className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setStatus("idle"); }}
              placeholder="Your full name"
            />
          </article>
          <article className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              readOnly
              disabled
              className="cursor-not-allowed opacity-60"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </article>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {status === "saved" && (
            <p className="text-sm text-emerald-500">Profile updated.</p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">{errorMsg || "Failed to save."}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
