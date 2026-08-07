"use client";

import { useRef, useState } from "react";

import { Download, Eye, ImageIcon, LoaderCircle, Minus, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type EvidenceImageViewerProps = {
  src: string;
  alt: string;
  fileName: string;
  caption?: string | null;
};

const MIN_ZOOM = 0.25;
const INITIAL_ZOOM = 0.75;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

export function EvidenceImageViewer({ src, alt, fileName, caption }: EvidenceImageViewerProps) {
  const [open, setOpen] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const resetView = () => {
    setZoom(INITIAL_ZOOM);
    setOffset({ x: 0, y: 0 });
  };

  const changeZoom = (nextZoom: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    setZoom(clamped);
    if (clamped <= INITIAL_ZOOM) {
      setOffset({ x: 0, y: 0 });
    }
  };

  const thumbnailSrc = `${src}${src.includes("?") ? "&" : "?"}thumbnail=1`;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setPreviewLoading(true);
          setPreviewFailed(false);
        }
        if (!nextOpen) {
          resetView();
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative grid aspect-[3/2] min-h-36 w-full place-items-center overflow-hidden rounded-t-md border-b bg-muted/30 text-left transition-colors hover:bg-muted/50"
          aria-label={`Buka pratinjau ${fileName}`}
        >
          {thumbnailFailed ? (
            <span className="flex max-w-[88%] flex-col items-center gap-2 text-center">
              <span className="grid size-10 place-items-center rounded-md border border-border bg-background/70 text-muted-foreground shadow-sm">
                <ImageIcon className="size-5" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">Thumbnail tidak tersedia</span>
            </span>
          ) : (
            <img
              src={thumbnailSrc}
              alt={alt}
              loading="lazy"
              decoding="async"
              width={480}
              height={320}
              onLoad={() => setThumbnailLoading(false)}
              onError={() => {
                setThumbnailLoading(false);
                setThumbnailFailed(true);
              }}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          )}
          {thumbnailLoading && !thumbnailFailed ? (
            <span
              role="status"
              aria-label="Memuat thumbnail"
              className="pointer-events-none absolute inset-0 grid place-items-center bg-muted/70 text-muted-foreground backdrop-blur-[1px]"
            >
              <span className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background/80 px-2.5 py-1.5 text-[11px] shadow-sm">
                <LoaderCircle className="size-3.5 animate-spin" /> Memuat
              </span>
            </span>
          ) : null}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 pt-10 text-white">
            <span className="min-w-0 truncate text-xs font-medium">{fileName}</span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/20 bg-black/35 px-2 py-1 text-[10px] font-semibold backdrop-blur-sm">
              <Eye className="size-3" />
              Lihat
            </span>
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="grid h-[90vh] w-[94vw] max-w-[94vw] grid-rows-[auto_1fr] gap-3 overflow-hidden bg-[#080b11] p-3 text-white sm:max-w-[94vw]">
        <DialogHeader className="pr-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate">{fileName}</DialogTitle>
              {caption ? <p className="mt-1 truncate text-xs text-white/60">{caption}</p> : null}
            </div>
            <div className="flex items-center gap-1">
              <Button
                asChild
                type="button"
                variant="outline"
                size="sm"
                className="mr-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <a href={`${src}${src.includes("?") ? "&" : "?"}download=1`} download={fileName}>
                  <Download className="size-4" /> Unduh
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Perkecil"
                onClick={() => changeZoom(zoom - ZOOM_STEP)}
                disabled={zoom <= MIN_ZOOM}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Minus className="size-4" />
                <span className="sr-only">Perkecil</span>
              </Button>
              <span className="w-14 text-center font-mono text-xs">{Math.round(zoom * 100)}%</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Perbesar"
                onClick={() => changeZoom(zoom + ZOOM_STEP)}
                disabled={zoom >= MAX_ZOOM}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Plus className="size-4" />
                <span className="sr-only">Perbesar</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Reset tampilan"
                onClick={resetView}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <RotateCcw className="size-4" />
                <span className="sr-only">Reset tampilan</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div
          role="application"
          aria-label={`Area pratinjau ${fileName}; gunakan roda mouse atau gestur untuk zoom dan geser gambar.`}
          className={`relative grid min-h-0 touch-none place-items-center overflow-hidden rounded-[4px] border border-white/10 bg-black ${zoom > INITIAL_ZOOM ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
          onDoubleClick={() => changeZoom(zoom === INITIAL_ZOOM ? 2 : INITIAL_ZOOM)}
          onWheel={(event) => {
            event.preventDefault();
            changeZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
          }}
          onPointerDown={(event) => {
            if (zoom <= INITIAL_ZOOM) {
              return;
            }
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              offsetX: offset.x,
              offsetY: offset.y,
            };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) {
              return;
            }
            setOffset({
              x: drag.offsetX + event.clientX - drag.startX,
              y: drag.offsetY + event.clientY - drag.startY,
            });
          }}
          onPointerUp={(event) => {
            if (dragRef.current?.pointerId === event.pointerId) {
              dragRef.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          {previewFailed ? (
            <span className="inline-flex items-center gap-2 text-sm text-white/65">
              <ImageIcon className="size-4" /> Pratinjau tidak dapat dimuat
            </span>
          ) : (
            <img
              src={src}
              alt={alt}
              decoding="async"
              draggable={false}
              onLoad={() => setPreviewLoading(false)}
              onError={() => {
                setPreviewLoading(false);
                setPreviewFailed(true);
              }}
              className="max-h-full max-w-full select-none object-contain will-change-transform"
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
            />
          )}
          {previewLoading && !previewFailed ? (
            <span
              role="status"
              aria-label="Memuat pratinjau gambar"
              className="pointer-events-none absolute inset-0 grid place-items-center bg-black/45 text-white/75"
            >
              <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/55 px-3 py-2 text-xs backdrop-blur-sm">
                <LoaderCircle className="size-4 animate-spin" /> Memuat pratinjau
              </span>
            </span>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
