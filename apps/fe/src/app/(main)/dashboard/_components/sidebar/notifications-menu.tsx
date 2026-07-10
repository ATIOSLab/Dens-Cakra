"use client";

import Link from "next/link";

import { Bell, CheckCheck } from "lucide-react";

import { dashboardNotifications, unreadNotificationsCount } from "@/app/(main)/dashboard/_components/notifications-data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" aria-label={`Open notifications. ${unreadNotificationsCount} unread`}>
          <span className="relative flex items-center justify-center">
            <Bell />
            {unreadNotificationsCount > 0 ? (
              <span className="-right-2 -top-2 absolute flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                {unreadNotificationsCount}
              </span>
            ) : null}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[26rem] rounded-2xl p-0">
        <div className="flex items-start justify-between gap-4 border-b px-4 py-4">
          <div>
            <h3 className="font-semibold text-lg">Notifications</h3>
            <p className="text-muted-foreground text-sm">{unreadNotificationsCount} unread</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-2">
            <CheckCheck />
            Mark all
          </Button>
        </div>

        <div className="max-h-[22rem] overflow-y-auto">
          {dashboardNotifications.map((notification) => (
            <div key={notification.id} className="border-b px-4 py-4 last:border-b-0">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-2 size-2 rounded-full ${notification.unread ? "bg-rose-500" : "bg-transparent"}`}
                />
                <div className="min-w-0">
                  <p className="font-medium text-base">{notification.title}</p>
                  <p className="mt-1 text-muted-foreground text-sm">{notification.description}</p>
                  <p className="mt-2 text-muted-foreground text-sm">{notification.timeLabel}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-2">
          <Button asChild variant="ghost" className="w-full justify-center">
            <Link prefetch={false} href="/dashboard/notifications">
              View all notifications
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
