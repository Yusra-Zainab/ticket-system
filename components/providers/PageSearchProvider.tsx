"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type PageSearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
  clearQuery: () => void;
  matchState: "idle" | "found" | "not-found";
};

const PageSearchContext =
  createContext<PageSearchContextValue | null>(null);

export function PageSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [matchState, setMatchState] = useState<
    "idle" | "found" | "not-found"
  >("idle");

  const findOnPage = useCallback((value: string) => {
    const search = value.trim();

    if (!search) {
      setMatchState("idle");
      return;
    }

    const page = document.querySelector("main");
    const pageText = page?.textContent ?? "";
    const found = pageText.toLocaleLowerCase().includes(search.toLocaleLowerCase());

    setMatchState(found ? "found" : "not-found");

    const nativeFind = (
      window as Window & {
        find?: (
          text: string,
          caseSensitive?: boolean,
          backwards?: boolean,
          wrapAround?: boolean,
          wholeWord?: boolean,
          searchInFrames?: boolean,
          showDialog?: boolean,
        ) => boolean;
      }
    ).find;

    if (!found || !nativeFind) {
      return;
    }

    // Native find gives the user the same visible selection and scroll-to-match
    // behavior as Ctrl+F without mutating React-owned DOM nodes.
    window.getSelection()?.removeAllRanges();
    nativeFind.call(window, search, false, false, true, false, false, false);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => findOnPage(query));
    return () => window.cancelAnimationFrame(frame);
  }, [findOnPage, query]);

  const value = useMemo(
    () => ({
      query,
      setQuery,
      clearQuery: () => {
        setQuery("");
        setMatchState("idle");
        window.getSelection()?.removeAllRanges();
      },
      matchState,
    }),
    [matchState, query],
  );

  return (
    <PageSearchContext.Provider value={value}>
      {children}
    </PageSearchContext.Provider>
  );
}

export function usePageSearch() {
  const context = useContext(PageSearchContext);

  if (!context) {
    throw new Error("usePageSearch must be used inside PageSearchProvider");
  }

  return context;
}
