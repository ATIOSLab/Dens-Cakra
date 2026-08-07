import { type ReactNode } from "react";
import { BackButton } from "./back-button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  backButton?: boolean | { href?: string; label?: string };
  breadcrumb?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  backButton,
  breadcrumb,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("relative z-20 flex min-w-0 flex-col gap-3 border-b border-border pb-[var(--dc-card-padding)]", className)}>
      {breadcrumb && <div className="text-xs leading-5 text-muted-foreground">{breadcrumb}</div>}
      
      {backButton && (
        <div className="flex items-center">
          {typeof backButton === "object" ? (
            <BackButton href={backButton.href} label={backButton.label} />
          ) : (
            <BackButton />
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-[clamp(1.5rem,1.35rem+0.6vw,1.75rem)] leading-tight font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {badge && <div className="flex items-center">{badge}</div>}
          </div>
          {description && (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex min-h-9 w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:[&>[data-slot=button]]:flex-none max-sm:[&>[data-slot=button]]:flex-1 lg:shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
