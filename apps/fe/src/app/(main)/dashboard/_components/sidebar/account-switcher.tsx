"use client";

import Link from "next/link";

import { CircleUser, MapPinned } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

import { useClientNetwork } from "./client-network";
import { useRoleWorkspace } from "./role-workspace-provider";
import { SignOutMenuItem } from "./sign-out-menu-item";

export function AccountSwitcher() {
  const { activeUser } = useRoleWorkspace();
  const network = useClientNetwork();

  if (!activeUser) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full border border-[var(--dc-border-subtle)] bg-card text-foreground shadow-[var(--dc-shadow-card)] transition-colors hover:bg-muted md:size-8"
          aria-label={`Buka menu akun untuk ${activeUser.name}`}
        >
          <Avatar className="size-7 rounded-full md:size-6">
            <AvatarImage src={activeUser.avatar || undefined} alt={activeUser.name} />
            <AvatarFallback>{getInitials(activeUser.name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-72 space-y-1 rounded-[var(--dc-radius-lg)] p-1"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="size-11 rounded-full">
            <AvatarImage src={activeUser.avatar || undefined} alt={activeUser.name} />
            <AvatarFallback>{getInitials(activeUser.name)}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-base">{activeUser.name}</span>
            <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MapPinned className="size-3.5" />
              <span className="truncate">
                {network.ipAddress} - {network.locationLabel}
              </span>
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/account" prefetch={false}>
              <CircleUser />
              Account
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <SignOutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
