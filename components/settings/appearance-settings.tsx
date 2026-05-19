"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const themes = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "system", label: "System", icon: Monitor },
] as const;

export function AppearanceSettings() {
  const [selected, setSelected] = useState("dark");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize how the dashboard looks</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm font-medium">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                selected === id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 hover:border-border hover:bg-muted/30"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Theme switching is UI-only in this preview. Dark mode is active by default.
        </p>
      </CardContent>
    </Card>
  );
}
