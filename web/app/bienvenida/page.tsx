import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TierSelector from "./tier-selector";

export default async function BienvenidoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/register");
  }

  // If user already has a business with persona configured, go to dashboard
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (business) {
    const { data: persona } = await supabase
      .from("personas")
      .select("id")
      .eq("business_id", business.id)
      .maybeSingle();

    if (persona) {
      redirect("/dashboard");
    }
  }

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "usuario";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-10">
      <TierSelector userName={name} />
    </div>
  );
}
