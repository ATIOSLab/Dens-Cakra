import { useMediaQuery } from "./use-media-query";

const LG_BREAKPOINT = 1024;

export function useIsLg() {
  return useMediaQuery(`(min-width: ${LG_BREAKPOINT}px)`);
}
