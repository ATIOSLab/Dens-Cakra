"use client";

import { useRef, useState } from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type EvidenceImageViewerProps = {
  src: string;
  alt: string;
  fileName: string;
  caption?: string | null;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

export function EvidenceImageViewer({ src, alt, fileName, caption }: EvidenceImageViewerProps) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const resetView = () => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  };

  const changeZoom = (nextZoom: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    setZoom(clamped);
    if (clamped === MIN_ZOOM) {
      setOffset({ x: 0, y: 0 });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetView();
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative block aspect-square w-full overflow-hidden bg-muted text-left"
          aria-label={`Buka pratinjau ${fileName}`}
        >
          <img src={src} alt={alt} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
          <span className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-[4px] border border-white/30 bg-black/65 text-white shadow">
            <Maximize2 className="size-4" />
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
          className={`relative grid min-h-0 touch-none place-items-center overflow-hidden rounded-[4px] border border-white/10 bg-black ${zoom > MIN_ZOOM ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
          onDoubleClick={() => changeZoom(zoom === MIN_ZOOM ? 2 : MIN_ZOOM)}
          onWheel={(event) => {
            event.preventDefault();
            changeZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
          }}
          onPointerDown={(event) => {
            if (zoom <= MIN_ZOOM) {
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
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="max-h-full max-w-full select-none object-contain will-change-transform"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
