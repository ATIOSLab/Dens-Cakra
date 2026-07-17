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
    <div className={cn("flex flex-col gap-4 border-b border-border pb-5 relative z-20", className)}>
      {breadcrumb && <div className="text-xs text-muted-foreground">{breadcrumb}</div>}
      
      {backButton && (
        <div className="flex items-center">
          {typeof backButton === "object" ? (
            <BackButton href={backButton.href} label={backButton.label} />
          ) : (
            <BackButton />
          )}
        </div>
      )}

      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold text-foreground text-xl tracking-tight sm:text-2xl">
              {title}
            </h1>
            {badge && <div className="flex items-center">{badge}</div>}
          </div>
          {description && (
            <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
