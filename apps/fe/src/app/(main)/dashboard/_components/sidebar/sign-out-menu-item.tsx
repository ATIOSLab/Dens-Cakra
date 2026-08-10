"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/auth-client";

import { useRoleWorkspace } from "./role-workspace-provider";

export function SignOutMenuItem() {
  const router = useRouter();
  const { activeRole } = useRoleWorkspace();
  const [isPending, startTransition] = useTransition();
  const signOutRedirect = activeRole === "field_officer" ? "/auth/officer" : "/auth/login";

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

          router.replace(signOutRedirect);
          router.refresh();
        });
      }}
    >
      <LogOut />
      {isPending ? "Keluar..." : "Keluar"}
    </DropdownMenuItem>
  );
}
