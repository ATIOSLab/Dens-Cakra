"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function KpiLoading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function KpiError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-[var(--dc-text-muted)]">{message}</CardContent>
    </Card>
  );
}

export function KpiEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        <p className="font-medium text-[var(--dc-text-primary)]">{title}</p>
        <p className="max-w-md text-sm text-[var(--dc-text-muted)]">{description}</p>
      </CardContent>
    </Card>
  );
}
