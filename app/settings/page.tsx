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
import type { UserProfile } from "@/types";
import {
  billingPlans,
  businessInfo,
  notificationSettings,
} from "@/lib/mock-data";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Try to get display name from profiles table, then user metadata, then email prefix
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name, name")
    .eq("id", user.id)
    .maybeSingle();

  const rawName: string =
    profileRow?.full_name ??
    profileRow?.name ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    "";

  const displayName = rawName.trim() || "No name set";
  const email = user.email ?? "";
  const initials = rawName.trim()
    ? rawName
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  const realUserProfile: UserProfile = {
    name: displayName,
    email,
    role: "Business Owner",
    avatarInitials: initials || "??",
  };

  const { data: business } = await supabase
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
        <ProfileSettings profile={realUserProfile} />
        {businessSettings && business ? (
          <BusinessSettings business={businessSettings} businessId={business.id} />
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
