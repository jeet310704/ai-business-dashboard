import { Check } from "lucide-react";
import type { BillingPlan } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BillingSettingsProps {
  plans: BillingPlan[];
}

export function BillingSettings({ plans }: BillingSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>Manage your subscription and billing details</CardDescription>
      </CardHeader>
      <CardContent>
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
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={plan.isCurrent ? "outline" : "default"}
                disabled={plan.isCurrent}
              >
                {plan.isCurrent ? "Current plan" : "Upgrade"}
              </Button>
            </article>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Billing integration coming soon. This is a placeholder UI.
        </p>
      </CardContent>
    </Card>
  );
}
