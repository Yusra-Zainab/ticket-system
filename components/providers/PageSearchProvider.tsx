"use client";

import { createContext, useContext, useMemo, useState } from "react";

type PageSearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
  clearQuery: () => void;
};

const PageSearchContext =
  createContext<PageSearchContextValue | null>(null);

export function PageSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState("");

  const value = useMemo(
    () => ({
      query,
      setQuery,
      clearQuery: () => setQuery(""),
    }),
    [query],
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
