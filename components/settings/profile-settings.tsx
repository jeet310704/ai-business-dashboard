"use client";

import { useState } from "react";
import type { UserProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileSettingsProps {
  profile: UserProfile;
}

export function ProfileSettings({ profile }: ProfileSettingsProps) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Manage your personal account details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted text-lg font-semibold">
            {profile.avatarInitials}
          </span>
          <div>
            <p className="font-medium">{profile.name}</p>
            <p className="text-sm text-muted-foreground">{profile.role}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </article>
          <article className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </article>
        </div>
        <Button>Save changes</Button>
      </CardContent>
    </Card>
  );
}
