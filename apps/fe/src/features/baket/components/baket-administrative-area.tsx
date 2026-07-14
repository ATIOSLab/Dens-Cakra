import { MapPinned } from "lucide-react";

import {
  type AdministrativeAreaNode,
  administrativeAreaHierarchy,
  administrativeAreaLabel,
  administrativeAreaLevelLabel,
} from "@/features/baket/administrative-area";

type BaketAdministrativeAreaProps = {
  area?: AdministrativeAreaNode | null;
};

export function BaketAdministrativeArea({ area }: BaketAdministrativeAreaProps) {
  const hierarchy = administrativeAreaHierarchy(area);

  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-4" aria-labelledby="baket-area-heading">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <MapPinned className="size-5" />
        </div>
        <div>
          <h3 id="baket-area-heading" className="font-medium">
            Wilayah administratif hasil GPS
          </h3>
          <p className="mt-1 text-muted-foreground text-sm">{administrativeAreaLabel(area)}</p>
        </div>
      </div>

      {hierarchy.length > 0 ? (
        <dl className="grid gap-3 border-t pt-3 sm:grid-cols-2 lg:grid-cols-4">
          {hierarchy.map((item) => (
            <div key={item.id ?? `${item.level}:${item.name}`}>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                {administrativeAreaLevelLabel(item.level)}
              </dt>
              <dd className="mt-1 font-medium text-sm">{item.name}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
