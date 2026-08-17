import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Page() {
  redirect("/dashboard/anev/laporan-masuk?status=UNDER_VERIFICATION");
}
