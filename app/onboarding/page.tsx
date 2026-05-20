import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function createBusiness(data: FormData) {
  "use server";

  const user = await requireUser();

  const businessName = data.get("businessName")?.toString().trim();
  const industry = data.get("industry")?.toString().trim();

  if (!businessName || !industry) {
    return;
  }

  const supabase = await createClient();

  // Ensure profile exists
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: user.user_metadata?.full_name ?? "",
    business_name: businessName,
  });

  if (profileError) {
    console.error("Profile creation failed:", profileError.message);
    return;
  }

  // Create business
  const { error: businessError } = await supabase.from("businesses").insert({
    owner_id: user.id,
    name: businessName,
    industry,
  });

  if (businessError) {
    console.error("Business creation failed:", businessError.message);
    return;
  }

  redirect("/dashboard");
}

export default async function OnboardingPage() {
  await requireUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Get started</CardTitle>

          <CardDescription>
            Finish onboarding by adding your business name and industry.
            You&apos;ll be redirected to your dashboard once completed.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={createBusiness} className="space-y-6">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="businessName">
                  Business name
                </Label>

                <Input
                  id="businessName"
                  name="businessName"
                  type="text"
                  required
                  placeholder="Acme Analytics"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="industry">
                  Industry
                </Label>

                <Input
                  id="industry"
                  name="industry"
                  type="text"
                  required
                  placeholder="Fintech"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit">
                Create business
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}