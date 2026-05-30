"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { BillingPlan } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BillingSettingsProps {
  plans: BillingPlan[];
}

export function BillingSettings({ plans }: BillingSettingsProps) {
  const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null);

  const currentPlan = plans.find((p) => p.isCurrent);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>Manage your subscription and billing details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current plan summary */}
        {currentPlan && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="mt-1 text-lg font-semibold">
              {currentPlan.name}{" "}
              <span className="text-base font-normal text-muted-foreground">
                {currentPlan.price}{currentPlan.period}
              </span>
            </p>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className="relative rounded-xl border border-border/60 p-5"
            >
              {plan.isCurrent && (
                <Badge className="absolute right-4 top-4" variant="default">
                  Current plan
                </Badge>
              )}
              <h4 className="text-lg font-semibold">{plan.name}</h4>
              <p className="mt-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={plan.isCurrent ? "outline" : "default"}
                disabled={plan.isCurrent}
                onClick={() => !plan.isCurrent && setUpgradeTarget(plan.name)}
              >
                {plan.isCurrent ? "Current plan" : `Upgrade to ${plan.name}`}
              </Button>
            </article>
          ))}
        </div>

        {/* Upgrade confirmation message */}
        {upgradeTarget && (
          <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Upgrade to {upgradeTarget}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  To upgrade your plan, contact us at{" "}
                  <a
                    href="mailto:support@aibusinessdash.com"
                    className="font-medium underline underline-offset-2 hover:text-foreground"
                  >
                    support@aibusinessdash.com
                  </a>{" "}
                  and we&apos;ll get you set up within 24 hours.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUpgradeTarget(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
