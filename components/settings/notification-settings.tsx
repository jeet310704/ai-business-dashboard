"use client";

import { useEffect, useState } from "react";
import type { NotificationSetting } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const STORAGE_KEY = "notification_preferences";

interface NotificationSettingsProps {
  settings: NotificationSetting[];
}

export function NotificationSettings({ settings: defaults }: NotificationSettingsProps) {
  const [settings, setSettings] = useState(defaults);
  const [mounted, setMounted] = useState(false);

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedMap: Record<string, boolean> = JSON.parse(saved);
        setSettings((prev) =>
          prev.map((s) => (s.id in savedMap ? { ...s, enabled: savedMap[s.id] } : s))
        );
      }
    } catch {}
  }, []);

  const toggle = (id: string) => {
    setSettings((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
      // Persist immediately
      try {
        const map: Record<string, boolean> = {};
        updated.forEach((s) => { map[s.id] = s.enabled; });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      } catch {}
      return updated;
    });
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
              checked={mounted ? setting.enabled : setting.enabled}
              onCheckedChange={() => toggle(setting.id)}
              id={setting.id}
            />
          </article>
        ))}
        {mounted && (
          <p className="text-xs text-muted-foreground">Preferences are saved in your browser.</p>
        )}
      </CardContent>
    </Card>
  );
}
