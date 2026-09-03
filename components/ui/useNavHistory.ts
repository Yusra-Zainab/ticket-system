"use client";

import { useSyncExternalStore } from "react";

/*
 * Reports whether the breadcrumb-bar Back / Forward buttons have anywhere to
 * go, so the shells can disable them instead of firing a dead
 * router.back()/forward(). Uses the Chromium Navigation API
 * (`window.navigation.canGoBack` / `canGoForward`) when present and falls
 * back to `history.length` (back only) elsewhere. Re-reads on every render
 * of the consuming shell (which re-renders on every route change).
 */

type NavState = { canBack: boolean; canForward: boolean };

type NavigationLike = {
  canGoBack?: boolean;
  canGoForward?: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

const SERVER_STATE: NavState = { canBack: false, canForward: false };

let cache: NavState = SERVER_STATE;

function getNavigation(): NavigationLike | null {
  if (typeof window === "undefined") return null;
  const nav = (window as unknown as { navigation?: NavigationLike }).navigation;
  return nav && typeof nav.canGoBack === "boolean" ? nav : null;
}

function read(): NavState {
  const nav = getNavigation();
  const next: NavState = nav
    ? { canBack: Boolean(nav.canGoBack), canForward: Boolean(nav.canGoForward) }
    : {
        canBack: typeof window !== "undefined" && window.history.length > 1,
        canForward: false,
      };

  if (next.canBack !== cache.canBack || next.canForward !== cache.canForward) {
    cache = next;
  }
  return cache;
}

function subscribe(onChange: () => void): () => void {
  const nav = getNavigation();
  if (nav) {
    nav.addEventListener("currententrychange", onChange);
    return () => nav.removeEventListener("currententrychange", onChange);
  }
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

export function useNavHistory(): NavState {
  return useSyncExternalStore(subscribe, read, () => SERVER_STATE);
}
