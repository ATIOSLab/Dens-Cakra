import * as React from "react";

function subscribe(query: string, onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQueryList = window.matchMedia(query);
  const listener = () => onStoreChange();

  if (typeof mediaQueryList.addEventListener === "function") {
    mediaQueryList.addEventListener("change", listener);

    return () => mediaQueryList.removeEventListener("change", listener);
  }

  mediaQueryList.addListener(listener);

  return () => mediaQueryList.removeListener(listener);
}

function getSnapshot(query: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string, serverSnapshot = false) {
  return React.useSyncExternalStore(
    (onStoreChange) => subscribe(query, onStoreChange),
    () => getSnapshot(query),
    () => serverSnapshot,
  );
}
