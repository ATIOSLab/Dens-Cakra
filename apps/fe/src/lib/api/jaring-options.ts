import { apiBrowserFetch } from "./browser-client";

const JARING_OPTIONS_PAGE_LIMIT = 100;

type JaringOptionSource = {
  id: string;
};

export async function fetchAllVerifiedJaringOptions<T extends JaringOptionSource>() {
  const items: T[] = [];
  let page = 1;
  let batch: T[];

  do {
    batch = await apiBrowserFetch<T[]>("/jaring", {
      query: {
        registrationStatus: "APPROVED",
        page,
        limit: JARING_OPTIONS_PAGE_LIMIT,
      },
    });
    items.push(...batch);
    page += 1;
  } while (batch.length === JARING_OPTIONS_PAGE_LIMIT);

  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
