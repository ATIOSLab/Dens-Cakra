import { redirect } from "next/navigation";

import { getSessionPrincipal } from "@/lib/auth/server-session";

export default async function Home() {
  const principal = await getSessionPrincipal();

  redirect(principal?.homeRoute ?? "/auth/login");
}
