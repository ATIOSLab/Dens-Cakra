"use client";

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
import { getSystemRoleLabel } from "@/navigation/sidebar/system-roles";

import { useRoleWorkspace } from "./role-workspace-provider";
import { SignOutMenuItem } from "./sign-out-menu-item";

export function AccountSwitcher() {
  const { activeUser, principal } = useRoleWorkspace();
  const sessionIp = principal.session.ipAddress ?? "Unknown IP";
  const sessionLocation = principal.session.locationLabel ?? "Unknown location";

  if (!activeUser) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-none transition hover:bg-slate-50"
          aria-label={`Open account menu for ${activeUser.name}`}
        >
          <Avatar className="size-8 rounded-full">
            <AvatarImage src={activeUser.avatar || undefined} alt={activeUser.name} />
            <AvatarFallback>{getInitials(activeUser.name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-72 space-y-1 rounded-2xl p-1" side="bottom" align="end" sideOffset={8}>
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar className="size-11 rounded-full">
            <AvatarImage src={activeUser.avatar || undefined} alt={activeUser.name} />
            <AvatarFallback>{getInitials(activeUser.name)}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-base">{activeUser.name}</span>
            <span className="truncate text-muted-foreground text-sm">{getSystemRoleLabel(activeUser.role)}</span>
            <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MapPinned className="size-3.5" />
              <span className="truncate">{sessionIp} - {sessionLocation}</span>
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <CircleUser />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <SignOutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
