"use client";

import { useState } from "react";

import { Bell, CheckCheck, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  formatNotificationTime,
  NOTIFICATION_TYPES,
  type NotificationType,
  notificationTypeLabel,
  useNotifications,
} from "@/features/notifications/use-notifications";
import { cn } from "@/lib/utils";

export function NotificationsPage() {
  const [type, setType] = useState<NotificationType | undefined>();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { items, unreadCount, loading, mutating, error, load, markAllAsRead, markAsRead } = useNotifications({
    limit: 100,
    type,
    unreadOnly,
  });

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Notifikasi</CardTitle>
                <Badge variant="outline">{unreadCount.toLocaleString("id-ID")} belum dibaca</Badge>
              </div>
              <CardDescription>Pusat notifikasi aktivitas, verifikasi, dan sistem DENS CAKRA.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={cn(loading && "animate-spin")} /> Segarkan
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void markAllAsRead()}
                disabled={mutating || unreadCount === 0}
              >
                <CheckCheck /> Tandai Semua Dibaca
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
            <NativeSelect
              aria-label="Filter kategori notifikasi"
              value={type ?? "ALL"}
              onChange={(event) =>
                setType(event.target.value === "ALL" ? undefined : (event.target.value as NotificationType))
              }
              className="sm:w-56"
            >
              <NativeSelectOption value="ALL">Semua Kategori</NativeSelectOption>
              {NOTIFICATION_TYPES.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {notificationTypeLabel(value)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button
              type="button"
              variant={unreadOnly ? "secondary" : "outline"}
              aria-pressed={unreadOnly}
              onClick={() => setUnreadOnly((current) => !current)}
            >
              Hanya Belum Dibaca
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
        </CardHeader>
      </Card>

      <div className="grid gap-3">
        {items.map((notification) => (
          <Card key={notification.id} className={cn(!notification.readAt && "border-sky-500/35 bg-sky-500/[0.03]")}>
            <CardContent className="flex items-start gap-3 pt-(--card-spacing)">
              <span
                className={cn("mt-2 size-2 shrink-0 rounded-full", notification.readAt ? "bg-border" : "bg-sky-500")}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-base">{notification.title}</p>
                  <Badge variant="outline">{notificationTypeLabel(notification.type)}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground text-sm">{notification.message}</p>
                <p className="mt-3 text-muted-foreground text-xs">
                  {formatNotificationTime(notification.createdAt)} WIB
                </p>
              </div>
              {!notification.readAt ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void markAsRead(notification.id)}
                  disabled={mutating}
                >
                  Tandai Dibaca
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {!loading && items.length === 0 ? (
          <Card>
            <CardContent className="grid min-h-40 place-items-center text-center text-muted-foreground">
              <span className="grid justify-items-center gap-2">
                <Bell className="size-6" /> Tidak ada notifikasi sesuai filter.
              </span>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
