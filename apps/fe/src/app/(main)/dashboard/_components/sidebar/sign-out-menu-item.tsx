"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/auth-client";

export function SignOutMenuItem() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
      disabled={isPending}
      onSelect={(event) => {
        event.preventDefault();

        startTransition(async () => {
          const { error } = await authClient.signOut();

          if (error) {
            toast.error(error.message || "Gagal keluar dari sesi.");
            return;
          }

          router.replace("/auth/login");
          router.refresh();
        });
      }}
    >
      <LogOut />
      {isPending ? "Keluar..." : "Log out"}
    </DropdownMenuItem>
  );
}
