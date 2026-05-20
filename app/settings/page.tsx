import { requireUser } from "@/lib/auth";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { BillingSettings } from "@/components/settings/billing-settings";
import { BusinessSettings } from "@/components/settings/business-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  billingPlans,
  businessInfo,
  notificationSettings,
  userProfile,
} from "@/lib/mock-data";

export default async function SettingsPage() {
  await requireUser();

  return (
    <DashboardShell title="Settings">
      <div className="mx-auto max-w-4xl space-y-6">
        <ProfileSettings profile={userProfile} />
        <BusinessSettings business={businessInfo} />
        <NotificationSettings settings={notificationSettings} />
        <AppearanceSettings />
        <BillingSettings plans={billingPlans} />
      </div>
    </DashboardShell>
  );
}
