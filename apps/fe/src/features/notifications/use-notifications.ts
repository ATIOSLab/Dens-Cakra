"use client";

import { useCallback, useEffect, useState } from "react";

import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";

export const NOTIFICATION_TYPES = [
  "DIRECTIVE",
  "TASK",
  "WHATSAPP_REPORT",
  "BAKET",
  "VERIFICATION",
  "PRODUCT",
  "APPROVAL",
  "REVISION",
  "ALERT",
  "SYSTEM",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  createdAt: string;
  readAt?: string | null;
};

type NotificationFilters = {
  limit?: number;
  type?: NotificationType;
  unreadOnly?: boolean;
};

const notificationUpdatedEvent = "dens-cakra:notifications-updated";

export function useNotifications({ limit = 20, type, unreadOnly = false }: NotificationFilters = {}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [notificationItems, unread] = await Promise.all([
        apiBrowserFetch<NotificationItem[]>("/notifications", {
          query: { limit, type, unreadOnly: unreadOnly ? true : undefined },
        }),
        apiBrowserFetch<{ count: number }>("/notifications/unread-count"),
      ]);
      setItems(Array.isArray(notificationItems) ? notificationItems : []);
      setUnreadCount(Number(unread?.count ?? 0));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Notifikasi gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [limit, type, unreadOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const reload = () => void load();
    window.addEventListener(notificationUpdatedEvent, reload);
    return () => window.removeEventListener(notificationUpdatedEvent, reload);
  }, [load]);

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0 || mutating) return;
    setMutating(true);
    setError(null);
    try {
      await apiBrowserMutation<{ affectedCount: number }>("POST", "/notifications/read-all", {});
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
      window.dispatchEvent(new Event(notificationUpdatedEvent));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status notifikasi gagal diperbarui.");
    } finally {
      setMutating(false);
    }
  }, [mutating, unreadCount]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (mutating) return;
      const target = items.find((item) => item.id === notificationId);
      if (!target || target.readAt) return;
      setMutating(true);
      setError(null);
      try {
        const updated = await apiBrowserMutation<NotificationItem>(
          "POST",
          `/notifications/${notificationId}/read`,
          undefined,
        );
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setUnreadCount((current) => Math.max(0, current - 1));
        window.dispatchEvent(new Event(notificationUpdatedEvent));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Status notifikasi gagal diperbarui.");
      } finally {
        setMutating(false);
      }
    },
    [items, mutating],
  );

  return { items, unreadCount, loading, mutating, error, load, markAllAsRead, markAsRead };
}

export function notificationTypeLabel(type: NotificationType) {
  const labels: Record<NotificationType, string> = {
    DIRECTIVE: "Direktif",
    TASK: "Tugas",
    WHATSAPP_REPORT: "Laporan WhatsApp",
    BAKET: "Bahan Keterangan (Baket)",
    VERIFICATION: "Verifikasi",
    PRODUCT: "Produk Intelijen",
    APPROVAL: "Persetujuan",
    REVISION: "Revisi",
    ALERT: "Peringatan",
    SYSTEM: "Sistem",
  };
  return labels[type];
}

export function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waktu tidak tersedia";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}
