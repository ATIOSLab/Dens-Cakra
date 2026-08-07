"use client";

import { ExternalLink, MapPin } from "lucide-react";

import { EvidenceAttachmentViewer } from "@/features/baket/components/evidence-attachment-viewer";

import type { ReportMediaItem, ReportMessageItem } from "./laporan-jaring-types";

function formatMessageTime(value?: string | null) {
  if (!value) return "Tersimpan";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Tersimpan";
  }
}

function legacyMessages(content?: string, mediaList: ReportMediaItem[] = [], sentAt?: string): ReportMessageItem[] {
  const fallbackTime = sentAt ?? new Date(0).toISOString();
  const result: ReportMessageItem[] = [];
  if (content?.trim()) {
    result.push({ id: "legacy-content", kind: "TEXT", text: content, sentAt: fallbackTime });
  }
  for (const media of mediaList) {
    result.push({
      id: media.id,
      kind: media.mimeType?.startsWith("video/") ? "VIDEO" : "IMAGE",
      fileId: media.fileId,
      caption: media.caption,
      fileName: media.fileName,
      mimeType: media.mimeType,
      sentAt: fallbackTime,
    });
  }
  return result;
}

export function WhatsAppReportThread({
  senderAlias,
  messages,
  fallbackContent,
  fallbackMedia = [],
  fallbackSentAt,
}: {
  senderAlias: string;
  messages?: ReportMessageItem[];
  fallbackContent?: string;
  fallbackMedia?: ReportMediaItem[];
  fallbackSentAt?: string;
}) {
  const timeline = messages?.length ? messages : legacyMessages(fallbackContent, fallbackMedia, fallbackSentAt);

  return (
    <div className="space-y-3 rounded-xl border bg-emerald-50/70 p-4 shadow-xs dark:bg-emerald-950/20">
      <div className="flex items-center gap-2 border-b pb-3 text-xs font-semibold text-foreground">
        <span className="flex size-7 items-center justify-center rounded-full bg-emerald-700 text-[10px] text-white">
          WA
        </span>
        Pesan WhatsApp Masuk · {senderAlias}
      </div>

      {timeline.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-background/80 p-4 text-sm text-muted-foreground">
          Belum ada pesan yang diterima.
        </p>
      ) : (
        <div className="space-y-2">
          {timeline.map((message) => (
            <div key={message.id} className="flex justify-start">
              <article className="max-w-[92%] rounded-2xl rounded-tl-sm border bg-background p-3 shadow-xs sm:max-w-[82%]">
                <p className="mb-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">{senderAlias}</p>

                {message.kind === "TEXT" ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.text}</p>
                ) : null}

                {message.kind === "IMAGE" || message.kind === "VIDEO" ? (
                  <div className="space-y-2">
                    <EvidenceAttachmentViewer
                      src={`/api/files/${message.fileId}`}
                      fileName={message.fileName || "Lampiran laporan Jaring"}
                      mimeType={message.mimeType}
                      caption={message.caption}
                    />
                    {message.caption ? (
                      <p className="whitespace-pre-wrap text-sm text-foreground">{message.caption}</p>
                    ) : null}
                  </div>
                ) : null}

                {message.kind === "LIVE_LOCATION" ? (
                  <div className="min-w-64 space-y-2 rounded-lg border bg-muted/40 p-3">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <MapPin className="size-4 text-rose-600" />
                      Live Location
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-muted-foreground">Latitude</dt>
                        <dd className="font-mono">{message.latitude}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Longitude</dt>
                        <dd className="font-mono">{message.longitude}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Akurasi</dt>
                        <dd>{message.accuracyMeters ? `±${message.accuracyMeters} meter` : "Tidak tercatat"}</dd>
                      </div>
                    </dl>
                    <a
                      href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline dark:text-sky-400"
                    >
                      Buka di peta <ExternalLink className="size-3" />
                    </a>
                  </div>
                ) : null}

                <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">
                  {formatMessageTime(message.sentAt)} ✓✓
                </p>
              </article>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
