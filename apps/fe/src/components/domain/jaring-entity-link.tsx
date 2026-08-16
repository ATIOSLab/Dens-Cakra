"use client";

import Link from "next/link";

import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function JaringEntityLink({
  jaringId,
  name,
  className,
  showIcon = true,
}: {
  jaringId?: string | null;
  name: string;
  className?: string;
  showIcon?: boolean;
}) {
  if (!jaringId) return <span className={className}>{name}</span>;

  return (
    <Link
      href={`/dashboard/daftar-jaring/${jaringId}`}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "group/entity inline-flex max-w-full items-center gap-1 text-sky-700 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 dark:text-sky-400",
        className,
      )}
      title={`Buka data ${name}`}
    >
      <span className="truncate">{name}</span>
      {showIcon ? (
        <ArrowUpRight className="size-3 shrink-0 opacity-70 transition-transform group-hover/entity:-translate-y-px group-hover/entity:translate-x-px" />
      ) : null}
    </Link>
  );
}
