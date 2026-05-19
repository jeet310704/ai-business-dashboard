"use client";

import { useState } from "react";
import type { BusinessInfo } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BusinessSettingsProps {
  business: BusinessInfo;
}

export function BusinessSettings({ business }: BusinessSettingsProps) {
  const [form, setForm] = useState(business);

  const update = (key: keyof BusinessInfo, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
        <Button>Update business info</Button>
      </CardContent>
    </Card>
  );
}
