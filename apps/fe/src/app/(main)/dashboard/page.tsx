import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/server-session";

export default async function Page() {
  const principal = await requireSession();

  redirect(principal.homeRoute);
}
