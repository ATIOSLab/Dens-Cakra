import { apiBrowserFetch } from "./browser-client";

const JARING_OPTIONS_PAGE_LIMIT = 500;
const JARING_OPTIONS_CACHE_TTL_MS = 60_000;

type JaringOptionSource = {
  id: string;
};

let cachedVerifiedJarings: {
  items: JaringOptionSource[];
  expiresAt: number;
} | null = null;
let inflightVerifiedJarings: Promise<JaringOptionSource[]> | null = null;

export async function fetchAllVerifiedJaringOptions<T extends JaringOptionSource>(): Promise<T[]> {
  const now = Date.now();
  if (cachedVerifiedJarings && cachedVerifiedJarings.expiresAt > now) {
    return cachedVerifiedJarings.items as T[];
  }
  if (inflightVerifiedJarings) {
    return (await inflightVerifiedJarings) as T[];
  }

  inflightVerifiedJarings = (async () => {
    try {
      const items: JaringOptionSource[] = [];
      let page = 1;
      let batch: JaringOptionSource[];

      do {
        batch = await apiBrowserFetch<JaringOptionSource[]>("/jaring", {
          query: {
            registrationStatus: "APPROVED",
            page,
            limit: JARING_OPTIONS_PAGE_LIMIT,
          },
        });
        items.push(...batch);
        page += 1;
      } while (batch.length === JARING_OPTIONS_PAGE_LIMIT);

      const deduped = Array.from(new Map(items.map((item) => [item.id, item])).values());
      cachedVerifiedJarings = {
        items: deduped,
        expiresAt: Date.now() + JARING_OPTIONS_CACHE_TTL_MS,
      };
      return deduped;
    } finally {
      inflightVerifiedJarings = null;
    }
  })();

  return (await inflightVerifiedJarings) as T[];
}
