"use client";

import { useState } from "react";

import { Download, ExternalLink, File, FileAudio, FileText, ImageIcon, LoaderCircle, Play, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { EvidenceImageViewer } from "./evidence-image-viewer";

type EvidenceAttachmentViewerProps = {
  src: string;
  fileName: string;
  mimeType?: string | null;
  caption?: string | null;
  className?: string;
};

function withDownload(src: string) {
  return `${src}${src.includes("?") ? "&" : "?"}download=1`;
}

function MediaThumbnail({ icon: Icon, fileName, label }: { icon: typeof Video; fileName: string; label: string }) {
  return (
    <span className="group relative grid aspect-[3/2] min-h-36 w-full place-items-center overflow-hidden rounded-t-md border-b bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--dc-primary)_14%,transparent),transparent_68%)]">
      <span className="grid size-14 place-items-center rounded-full border border-border bg-background/85 text-primary shadow-lg backdrop-blur-sm transition-transform group-hover:scale-105">
        <Icon className="size-6" />
      </span>
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-10 text-white">
        <span className="min-w-0 truncate text-xs font-medium">{fileName}</span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/20 bg-black/35 px-2 py-1 text-[10px] font-semibold backdrop-blur-sm">
          <Play className="size-3" /> {label}
        </span>
      </span>
    </span>
  );
}

export function EvidenceAttachmentViewer({
  src,
  fileName,
  mimeType,
  caption,
  className,
}: EvidenceAttachmentViewerProps) {
  const [mediaLoading, setMediaLoading] = useState(true);
  const [documentLoading, setDocumentLoading] = useState(true);
  const mime = mimeType?.toLowerCase() ?? "application/octet-stream";
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");
  const isPdf = mime === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  const canEmbedDocument = isPdf || mime.startsWith("text/");
  let Icon = File;
  if (isVideo) Icon = Video;
  else if (isAudio) Icon = FileAudio;
  else if (isImage) Icon = ImageIcon;
  else if (isPdf) Icon = FileText;

  if (isImage) {
    return (
      <Card className={className}>
        <EvidenceImageViewer src={src} alt={fileName} fileName={fileName} caption={caption} />
        <CardContent className="flex items-center justify-between gap-2 p-2.5">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{fileName}</p>
            {caption ? <p className="truncate text-[11px] text-muted-foreground">{caption}</p> : null}
          </div>
          <Button asChild size="icon-xs" variant="outline">
            <a href={withDownload(src)} download={fileName} title="Unduh lampiran">
              <Download className="size-3.5" />
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isVideo) {
    return (
      <Card className={className}>
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="w-full text-left" aria-label={`Putar video ${fileName}`}>
              <MediaThumbnail icon={Video} fileName={fileName} label="Putar" />
            </button>
          </DialogTrigger>
          <DialogContent className="grid max-h-[92dvh] w-[94vw] max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden p-3 sm:max-w-5xl">
            <DialogHeader className="pr-10">
              <DialogTitle className="truncate">{fileName}</DialogTitle>
            </DialogHeader>
            <div className="relative grid min-h-48 place-items-center overflow-hidden rounded-md bg-black">
              {/* biome-ignore lint/a11y/useMediaCaption: Bukti pengguna tidak selalu menyediakan berkas subtitle terpisah. */}
              <video
                controls
                preload="metadata"
                className="max-h-[78dvh] w-full"
                src={src}
                onLoadedMetadata={() => setMediaLoading(false)}
                onError={() => setMediaLoading(false)}
              >
                Browser tidak mendukung pemutaran video.
              </video>
              {mediaLoading ? (
                <span
                  role="status"
                  className="pointer-events-none absolute inset-0 grid place-items-center bg-black/45 text-white/75"
                >
                  <span className="inline-flex items-center gap-2 text-xs">
                    <LoaderCircle className="size-4 animate-spin" /> Memuat video
                  </span>
                </span>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
        <CardContent className="flex items-center justify-between gap-2 p-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{fileName}</p>
            {caption ? <p className="truncate text-[11px] text-muted-foreground">{caption}</p> : null}
          </div>
          <Button asChild size="sm" variant="outline">
            <a href={withDownload(src)} download={fileName}>
              <Download className="size-3.5" /> Unduh
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isAudio) {
    return (
      <Card className={className}>
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="w-full text-left" aria-label={`Putar audio ${fileName}`}>
              <MediaThumbnail icon={FileAudio} fileName={fileName} label="Putar" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader className="pr-10">
              <DialogTitle className="truncate">{fileName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {mediaLoading ? (
                <span role="status" className="inline-flex items-center gap-2 text-muted-foreground text-xs">
                  <LoaderCircle className="size-3.5 animate-spin" /> Memuat audio
                </span>
              ) : null}
              {/* biome-ignore lint/a11y/useMediaCaption: Bukti audio pengguna tidak memiliki track transkripsi terpisah. */}
              <audio
                controls
                preload="metadata"
                className="h-10 w-full"
                src={src}
                onLoadedMetadata={() => setMediaLoading(false)}
                onError={() => setMediaLoading(false)}
              >
                Browser tidak mendukung pemutaran audio.
              </audio>
            </div>
          </DialogContent>
        </Dialog>
        <CardContent className="flex items-center justify-between gap-2 p-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{fileName}</p>
            {caption ? <p className="truncate text-[11px] text-muted-foreground">{caption}</p> : null}
          </div>
          <Button asChild size="sm" variant="outline">
            <a href={withDownload(src)} download={fileName}>
              <Download className="size-3.5" /> Unduh
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="flex min-h-36 flex-col items-center justify-center gap-3 p-4 text-center">
        <Icon className="size-8 text-muted-foreground" />
        <div className="min-w-0 max-w-full">
          <p className="truncate text-sm font-medium">{fileName}</p>
          <p className="mt-1 text-xs text-muted-foreground">{mimeType ?? "Jenis dokumen tidak teridentifikasi"}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {canEmbedDocument ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Play className="size-3.5" /> Lihat dokumen
                </Button>
              </DialogTrigger>
              <DialogContent className="grid h-[90vh] w-[94vw] max-w-[94vw] grid-rows-[auto_1fr] gap-3 overflow-hidden p-3 sm:max-w-[94vw]">
                <DialogHeader>
                  <DialogTitle className="truncate pr-10">{fileName}</DialogTitle>
                </DialogHeader>
                <div className="relative min-h-0">
                  <iframe
                    src={src}
                    title={`Pratinjau ${fileName}`}
                    onLoad={() => setDocumentLoading(false)}
                    className="size-full rounded-lg border bg-white"
                  />
                  {documentLoading ? (
                    <span
                      role="status"
                      className="pointer-events-none absolute inset-0 grid place-items-center bg-background/80 text-muted-foreground"
                    >
                      <span className="inline-flex items-center gap-2 text-xs">
                        <LoaderCircle className="size-4 animate-spin" /> Memuat dokumen
                      </span>
                    </span>
                  ) : null}
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button asChild size="sm" variant="outline">
              <a href={src} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" /> Buka dokumen
              </a>
            </Button>
          )}
          <Button asChild size="sm">
            <a href={withDownload(src)} download={fileName}>
              <Download className="size-3.5" /> Unduh
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
