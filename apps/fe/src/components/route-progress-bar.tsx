"use client";

import { useEffect, useRef, useState } from "react";

import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

type RouteProgressBarProps = {
  className?: string;
};

const COMPLETE_DELAY_MS = 240;
const FALLBACK_DONE_MS = 8000;

function isModifiedEvent(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function shouldTrackAnchor(anchor: HTMLAnchorElement, event: MouseEvent) {
  if (event.defaultPrevented || isModifiedEvent(event)) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download") || anchor.dataset.progress === "false") return false;

  const nextUrl = new URL(anchor.href, window.location.href);
  const currentUrl = new URL(window.location.href);

  if (nextUrl.origin !== currentUrl.origin) return false;

  const nextPath = `${nextUrl.pathname}${nextUrl.search}`;
  const currentPath = `${currentUrl.pathname}${currentUrl.search}`;

  return nextPath !== currentPath;
}

export function RouteProgressBar({ className }: RouteProgressBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const currentRouteRef = useRef(`${pathname}?${searchParams.toString()}`);
  const hideTimerRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const interval = window.setInterval(() => {
      setProgress((value) => {
        if (value < 48) return value + 9;
        if (value < 78) return value + 4;
        if (value < 92) return value + 1;
        return value;
      });
    }, 180);

    return () => window.clearInterval(interval);
  }, [isVisible]);

  useEffect(() => {
    const start = () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);

      setIsVisible(true);
      setProgress(12);

      fallbackTimerRef.current = window.setTimeout(() => {
        setProgress(100);
        hideTimerRef.current = window.setTimeout(() => setIsVisible(false), COMPLETE_DELAY_MS);
      }, FALLBACK_DONE_MS);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");

      if (!anchor || !shouldTrackAnchor(anchor, event)) return;
      start();
    };

    window.addEventListener("click", onClick, { capture: true });

    return () => window.removeEventListener("click", onClick, { capture: true });
  }, []);

  useEffect(() => {
    const currentRoute = `${pathname}?${searchParams.toString()}`;

    if (currentRouteRef.current === currentRoute) return;
    currentRouteRef.current = currentRoute;

    if (!isVisible) return;

    if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
    setProgress(100);

    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, COMPLETE_DELAY_MS);
  }, [isVisible, pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden transition-opacity duration-200",
        isVisible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <div
        className="h-full origin-left bg-[linear-gradient(90deg,var(--dc-primary),var(--dc-success),var(--dc-primary))] shadow-[0_0_18px_color-mix(in_srgb,var(--dc-primary)_55%,transparent)] transition-transform duration-200 ease-out"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
      <div className="absolute inset-y-0 right-0 w-20 translate-x-full animate-pulse bg-white/45 blur-sm" />
    </div>
  );
}
