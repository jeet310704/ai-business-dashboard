"use client";

import { useState } from "react";
import type { NotificationSetting } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface NotificationSettingsProps {
  settings: NotificationSetting[];
}

export function NotificationSettings({ settings: initial }: NotificationSettingsProps) {
  const [settings, setSettings] = useState(initial);

  const toggle = (id: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choose what updates you want to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.map((setting) => (
          <article
            key={setting.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border/50 p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{setting.label}</p>
              <p className="text-sm text-muted-foreground">{setting.description}</p>
            </div>
            <Switch
              checked={setting.enabled}
              onCheckedChange={() => toggle(setting.id)}
              id={setting.id}
            />
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
