import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { BillingSettings } from "@/components/settings/billing-settings";
import { BusinessSettings } from "@/components/settings/business-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  billingPlans,
  businessInfo,
  notificationSettings,
  userProfile,
} from "@/lib/mock-data";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name, industry, created_at")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  const businessSettings = business
    ? {
        ...businessInfo,
        companyName: business.name ?? businessInfo.companyName,
        industry: business.industry ?? businessInfo.industry,
      }
    : null;

  return (
    <DashboardShell title="Settings">
      <div className="mx-auto max-w-4xl space-y-6">
        <ProfileSettings profile={userProfile} />
        {businessSettings ? (
          <BusinessSettings business={businessSettings} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                No business record was found for your account yet. Complete onboarding to connect your business and enable settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Start onboarding
              </Link>
            </CardContent>
          </Card>
        )}
        <NotificationSettings settings={notificationSettings} />
        <AppearanceSettings />
        <BillingSettings plans={billingPlans} />
      </div>
    </DashboardShell>
  );
}
