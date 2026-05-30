"use client";

import { useState } from "react";
import type { BusinessInfo } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BusinessSettingsProps {
  business: BusinessInfo;
  businessId: string;
}

export function BusinessSettings({ business, businessId }: BusinessSettingsProps) {
  const [form, setForm] = useState(business);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const update = (key: keyof BusinessInfo, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus("idle");
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus("idle");

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("businesses")
        .update({
          name: form.companyName.trim(),
          industry: form.industry.trim(),
        })
        .eq("id", businessId);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
        <CardDescription>Company details used for reports and analytics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <article className="space-y-2">
          <Label htmlFor="company">Company name</Label>
          <Input
            id="company"
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
          />
        </article>
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={form.industry}
              onChange={(e) => update("industry", e.target.value)}
            />
          </article>
          <article className="space-y-2">
            <Label htmlFor="employees">Team size</Label>
            <Input
              id="employees"
              value={form.employees}
              onChange={(e) => update("employees", e.target.value)}
            />
          </article>
          <article className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={form.currency}
              onChange={(e) => update("currency", e.target.value)}
            />
          </article>
          <article className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value)}
            />
          </article>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Update business info"}
          </Button>
          {status === "saved" && (
            <p className="text-sm text-emerald-500">Business info updated.</p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">{errorMsg || "Failed to save."}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
