import { Hash, MapPin, Phone, UserCheck, UserRound } from "lucide-react";

import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type JaringIdentitySource, resolveJaringIdentity } from "@/lib/domain/jaring-identity";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { cn } from "@/lib/utils";

const IDENTITY_ROWS = [
  { key: "name", label: DOMAIN_TERMS.jaringName, icon: UserRound, tone: "text-sky-600 dark:text-sky-400" },
  { key: "code", label: DOMAIN_TERMS.jaringCode, icon: Hash, tone: "text-violet-600 dark:text-violet-400" },
  {
    key: "gaswilName",
    label: DOMAIN_TERMS.jaringCaretaker,
    icon: UserCheck,
    tone: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "placementArea",
    label: DOMAIN_TERMS.jaringPlacementArea,
    icon: MapPin,
    tone: "text-rose-600 dark:text-rose-400",
  },
  {
    key: "whatsappNumber",
    label: DOMAIN_TERMS.jaringWhatsApp,
    icon: Phone,
    tone: "text-emerald-600 dark:text-emerald-400",
  },
] as const;

type IdentityRowKey = (typeof IDENTITY_ROWS)[number]["key"];
type IdentityLabelOverrides = Partial<Record<IdentityRowKey, string>>;

export function JaringIdentitySummary({
  source,
  compact = false,
  linkWhatsApp = true,
  labelOverrides,
  className,
}: {
  source: JaringIdentitySource;
  compact?: boolean;
  linkWhatsApp?: boolean;
  labelOverrides?: IdentityLabelOverrides;
  className?: string;
}) {
  const identity = resolveJaringIdentity(source);
  const initials =
    identity.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "JR";

  return (
    <div className={cn("flex min-w-0 items-start gap-3", className)}>
      <Avatar className={cn("shrink-0 border border-border/80 bg-muted shadow-sm", compact ? "size-10" : "size-14")}>
        {identity.avatarUrl ? (
          <AvatarImage src={identity.avatarUrl} alt={`${DOMAIN_TERMS.jaringAvatar} ${identity.name}`} />
        ) : null}
        <AvatarFallback className="bg-primary/10 font-bold font-mono text-primary text-xs">{initials}</AvatarFallback>
      </Avatar>

      <dl className={cn("grid min-w-0 flex-1 gap-2", compact ? "gap-1" : "sm:grid-cols-2")}>
        {IDENTITY_ROWS.map(({ key, label, icon: Icon, tone }) => {
          const value = identity[key];
          const isPhone = key === "whatsappNumber" && value !== "Belum tersedia";
          const isGaswil = key === "gaswilName";
          const displayLabel = labelOverrides?.[key] ?? label;
          return (
            <div
              key={key}
              className={cn(
                "grid min-w-0 grid-cols-[16px_minmax(0,1fr)] items-start gap-x-2",
                !compact && "rounded-lg border border-border/70 bg-muted/25 p-3",
              )}
            >
              <Icon className={cn("mt-0.5 size-3.5 shrink-0", tone)} aria-hidden="true" />
              <div className="min-w-0">
                <dt className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
                  {displayLabel}
                </dt>
                <dd
                  className={cn(
                    "mt-0.5 min-w-0 font-medium text-foreground text-xs",
                    (key === "code" || key === "whatsappNumber") && "font-mono",
                    compact && key !== "placementArea" ? "truncate" : "break-words",
                  )}
                >
                  {isPhone && linkWhatsApp ? (
                    <a
                      href={`https://wa.me/${value.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      {value}
                    </a>
                  ) : isGaswil ? (
                    <GaswilEntityLink
                      name={value}
                      assignmentId={identity.gaswilAssignmentId}
                      userProfileId={identity.gaswilUserProfileId}
                      href={identity.gaswilHref}
                    />
                  ) : (
                    value
                  )}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
