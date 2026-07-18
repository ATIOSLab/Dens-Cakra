import { CheckCheck } from "lucide-react";

import {
  dashboardNotifications,
  unreadNotificationsCount,
} from "@/app/(main)/dashboard/_components/notifications-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function NotificationsPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Notifications</CardTitle>
              <Badge variant="outline">{unreadNotificationsCount} unread</Badge>
            </div>
            <CardDescription>
              Pusat notifikasi untuk pembaruan aktivitas, review, dan sistem DENS CAKRA.
            </CardDescription>
          </div>
          <Button variant="outline" className="gap-2">
            <CheckCheck />
            Mark all as read
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {dashboardNotifications.map((notification) => (
          <Card key={notification.id}>
            <CardContent className="flex items-start gap-3 pt-(--card-spacing)">
              <span className={`mt-2 size-2 rounded-full ${notification.unread ? "bg-rose-500" : "bg-border"}`} />
              <div className="min-w-0">
                <p className="font-medium text-base">{notification.title}</p>
                <p className="mt-1 text-muted-foreground text-sm">{notification.description}</p>
                <p className="mt-3 text-muted-foreground text-sm">{notification.timeLabel}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
