"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("locationchange", onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("locationchange", onStoreChange);
  };
}

export function useQueryParam(name: string, fallback = "") {
  const getSnapshot = useCallback(
    () => new URLSearchParams(window.location.search).get(name) ?? fallback,
    [fallback, name],
  );
  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function removeQueryParam(name: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event("locationchange"));
}
