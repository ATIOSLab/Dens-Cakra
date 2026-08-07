"use client";

import Link from "next/link";

import { Bell, CheckCheck, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatNotificationTime, useNotifications } from "@/features/notifications/use-notifications";
import { cn } from "@/lib/utils";

export function NotificationsMenu() {
  const { items, unreadCount, loading, mutating, error, load, markAllAsRead, markAsRead } = useNotifications({
    limit: 6,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={`Buka notifikasi. ${unreadCount} belum dibaca`}>
          <span className="relative flex items-center justify-center">
            <Bell />
            {unreadCount > 0 ? (
              <span className="absolute -top-2 -right-2 flex min-w-5 items-center justify-center rounded-full bg-[var(--dc-danger)] px-1.5 font-semibold text-[11px] text-white">
                {unreadCount}
              </span>
            ) : null}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(26rem,calc(100vw-1rem))] rounded-[var(--dc-radius-lg)] p-0"
      >
        <div className="flex items-start justify-between gap-4 border-b px-4 py-4">
          <div>
            <h3 className="font-semibold text-lg">Notifikasi</h3>
            <p className="text-muted-foreground text-sm">{unreadCount} belum dibaca</p>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Segarkan notifikasi"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={cn(loading && "animate-spin")} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void markAllAsRead()}
              disabled={mutating || unreadCount === 0}
            >
              <CheckCheck /> Tandai Semua
            </Button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="border-b px-4 py-3 text-destructive text-xs">
            {error}
          </p>
        ) : null}
        <div className="max-h-[22rem] overflow-y-auto">
          {items.map((notification) => (
            <button
              type="button"
              key={notification.id}
              onClick={() => void markAsRead(notification.id)}
              disabled={Boolean(notification.readAt) || mutating}
              className="flex w-full items-start gap-3 border-b px-4 py-4 text-left last:border-b-0 hover:bg-muted/50 disabled:cursor-default disabled:opacity-80"
            >
              <span
                className={cn(
                  "mt-2 size-2 shrink-0 rounded-full",
                  notification.readAt ? "bg-border" : "bg-[var(--dc-primary)]",
                )}
              />
              <span className="min-w-0">
                <span className="block font-medium text-sm">{notification.title}</span>
                <span className="mt-1 line-clamp-2 block text-muted-foreground text-xs">{notification.message}</span>
                <span className="mt-2 block text-[11px] text-muted-foreground">
                  {formatNotificationTime(notification.createdAt)} WIB
                </span>
              </span>
            </button>
          ))}
          {!loading && items.length === 0 ? (
            <p className="px-4 py-8 text-center text-muted-foreground text-sm">Belum ada notifikasi.</p>
          ) : null}
        </div>

        <div className="border-t p-2">
          <Button asChild variant="ghost" className="w-full justify-center">
            <Link prefetch={false} href="/dashboard/notifications">
              Lihat Semua Notifikasi
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
