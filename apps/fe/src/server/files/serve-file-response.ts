import { type NextRequest, NextResponse } from "next/server";

import sharp from "sharp";

import { getBackendInternalUrl } from "@/lib/auth/backend-url";
import { backendApi } from "@/server/backend-api";

import { createHash } from "node:crypto";

type AccessUrlResponse = {
  url: string;
  mimeType?: string | null;
  originalName?: string | null;
  sizeBytes?: string | number | null;
  checksumSha256?: string | null;
};

type ThumbnailCacheEntry = {
  body: Buffer;
  etag: string;
  expiresAt: number;
};

type ThumbnailRuntime = {
  cache: Map<string, ThumbnailCacheEntry>;
  cacheBytes: number;
  inFlight: Map<string, Promise<ThumbnailCacheEntry>>;
  activeTransforms: number;
  waiters: Array<() => void>;
};

const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_HEIGHT = 320;
const THUMBNAIL_QUALITY = 72;
const THUMBNAIL_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 96;
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
const MAX_SOURCE_BYTES = 32 * 1024 * 1024;
const MAX_PARALLEL_TRANSFORMS = 2;

const globalRuntime = globalThis as typeof globalThis & {
  __densCakraThumbnailRuntime?: ThumbnailRuntime;
};

const runtime: ThumbnailRuntime = globalRuntime.__densCakraThumbnailRuntime ?? {
  cache: new Map(),
  cacheBytes: 0,
  inFlight: new Map(),
  activeTransforms: 0,
  waiters: [] as Array<() => void>,
};

if (!globalRuntime.__densCakraThumbnailRuntime) {
  globalRuntime.__densCakraThumbnailRuntime = runtime;
}

function contentDisposition(disposition: "inline" | "attachment", originalName?: string | null) {
  if (!originalName) return disposition;
  const fallback = originalName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(originalName)}`;
}

function getCachedThumbnail(key: string) {
  const entry = runtime.cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    runtime.cache.delete(key);
    runtime.cacheBytes -= entry.body.byteLength;
    return null;
  }
  runtime.cache.delete(key);
  runtime.cache.set(key, entry);
  return entry;
}

function cacheThumbnail(key: string, entry: ThumbnailCacheEntry) {
  const previous = runtime.cache.get(key);
  if (previous) runtime.cacheBytes -= previous.body.byteLength;
  runtime.cache.delete(key);
  runtime.cache.set(key, entry);
  runtime.cacheBytes += entry.body.byteLength;

  while (runtime.cache.size > MAX_CACHE_ENTRIES || runtime.cacheBytes > MAX_CACHE_BYTES) {
    const oldestKey = runtime.cache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    const oldest = runtime.cache.get(oldestKey);
    runtime.cache.delete(oldestKey);
    runtime.cacheBytes -= oldest?.body.byteLength ?? 0;
  }
}

async function withTransformSlot<T>(work: () => Promise<T>) {
  if (runtime.activeTransforms >= MAX_PARALLEL_TRANSFORMS) {
    await new Promise<void>((resolve) => runtime.waiters.push(resolve));
  }

  runtime.activeTransforms += 1;
  try {
    return await work();
  } finally {
    runtime.activeTransforms -= 1;
    runtime.waiters.shift()?.();
  }
}

async function buildThumbnail(fileUrl: string) {
  return withTransformSlot(async () => {
    const response = await fetch(fileUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(`Sumber thumbnail tidak dapat dibaca (${response.status}).`);
    }

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_SOURCE_BYTES) {
      throw new Error("Ukuran sumber thumbnail melampaui batas pemrosesan aman.");
    }

    const source = Buffer.from(await response.arrayBuffer());
    if (source.byteLength > MAX_SOURCE_BYTES) {
      throw new Error("Ukuran sumber thumbnail melampaui batas pemrosesan aman.");
    }

    const body = await sharp(source, {
      animated: false,
      failOn: "warning",
      limitInputPixels: 24_000_000,
      sequentialRead: true,
    })
      .rotate()
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: "cover",
        position: "attention",
        withoutEnlargement: true,
      })
      .webp({ quality: THUMBNAIL_QUALITY, effort: 3, smartSubsample: true })
      .toBuffer();

    return {
      body,
      etag: `"thumb-${createHash("sha256").update(body).digest("base64url")}"`,
      expiresAt: Date.now() + THUMBNAIL_TTL_MS,
    } satisfies ThumbnailCacheEntry;
  });
}

function thumbnailResponse(request: NextRequest, entry: ThumbnailCacheEntry) {
  if (request.headers.get("if-none-match") === entry.etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        "cache-control": "private, max-age=86400, stale-while-revalidate=604800",
        etag: entry.etag,
        vary: "Cookie",
      },
    });
  }

  return new NextResponse(new Uint8Array(entry.body), {
    headers: {
      "cache-control": "private, max-age=86400, stale-while-revalidate=604800",
      "content-length": String(entry.body.byteLength),
      "content-type": "image/webp",
      etag: entry.etag,
      vary: "Cookie",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function serveAuthenticatedFile(request: NextRequest, fileId: string) {
  try {
    const shouldDownload = request.nextUrl.searchParams.get("download") === "1";
    const wantsThumbnail = !shouldDownload && request.nextUrl.searchParams.get("thumbnail") === "1";
    const access = await backendApi<AccessUrlResponse>(`/files/${fileId}/access-url`, {
      cookie: request.headers.get("cookie") ?? "",
      query: { ttlSeconds: 120, disposition: shouldDownload ? "attachment" : "inline" },
    });
    const fileUrl = access.url.startsWith("http") ? access.url : `${getBackendInternalUrl()}${access.url}`;
    const mimeType = access.mimeType?.toLowerCase() ?? "application/octet-stream";

    if (wantsThumbnail && mimeType.startsWith("image/")) {
      const cacheKey = `${fileId}:${access.checksumSha256 ?? "current"}:${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}`;
      const cached = getCachedThumbnail(cacheKey);
      if (cached) return thumbnailResponse(request, cached);

      let pending = runtime.inFlight.get(cacheKey);
      if (!pending) {
        pending = buildThumbnail(fileUrl).then((entry) => {
          cacheThumbnail(cacheKey, entry);
          return entry;
        });
        runtime.inFlight.set(cacheKey, pending);
        pending.finally(() => runtime.inFlight.delete(cacheKey)).catch(() => undefined);
      }
      return thumbnailResponse(request, await pending);
    }

    const range = request.headers.get("range");
    const response = await fetch(fileUrl, {
      cache: "no-store",
      headers: range ? { range } : undefined,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok || !response.body) {
      return NextResponse.json({ message: "File tidak dapat dibaca." }, { status: response.status || 404 });
    }

    const headers = new Headers({
      "accept-ranges": response.headers.get("accept-ranges") ?? "bytes",
      "cache-control": shouldDownload ? "private, no-store" : "private, max-age=300",
      "content-disposition": contentDisposition(shouldDownload ? "attachment" : "inline", access.originalName),
      "content-type": access.mimeType ?? response.headers.get("content-type") ?? "application/octet-stream",
      vary: "Cookie, Range",
      "x-content-type-options": "nosniff",
    });

    for (const headerName of ["content-length", "content-range", "etag", "last-modified"]) {
      const value = response.headers.get(headerName);
      if (value) headers.set(headerName, value);
    }

    return new NextResponse(response.body, { status: response.status, headers });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal membaca file." },
      { status: 500 },
    );
  }
}
