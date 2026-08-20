"use client";

import {
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import {
  NotificationRow,
} from "@/components/ui/NotificationPopover";
import { useApp } from "@/components/providers/AppProvider";
import { cn } from "@/lib/utils";

const tabs = [
  "All",
  "Tickets",
  "Mentions",
  "Deadlines",
  "System",
] as const;

type NotificationTab =
  (typeof tabs)[number];

export default function NotificationsPage() {
  const {
    notifications,
    markRead,
    markAllRead,
  } = useApp();

  const [tab, setTab] =
    useState<NotificationTab>("All");

  const [query, setQuery] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(10);

  const filtered = useMemo(() => {
    const search =
      query
        .trim()
        .toLowerCase();

    return notifications.filter(
      (item) => {
        const matchesTab =
          tab === "All" ||
          item.category === tab;

        const matchesSearch =
          !search ||
          `${item.title} ${item.body} ${item.category}`
            .toLowerCase()
            .includes(search);

        return (
          matchesTab &&
          matchesSearch
        );
      },
    );
  }, [
    notifications,
    query,
    tab,
  ]);

  const pageCount =
    Math.max(
      1,
      Math.ceil(
        filtered.length /
          pageSize,
      ),
    );

  const currentPage =
    Math.min(
      page,
      pageCount,
    );

  const pageStart =
    (currentPage - 1) *
    pageSize;

  const visible =
    filtered.slice(
      pageStart,
      pageStart +
        pageSize,
    );

  const firstItem =
    filtered.length === 0
      ? 0
      : pageStart + 1;

  const lastItem =
    Math.min(
      pageStart +
        pageSize,
      filtered.length,
    );

  return (
    <div className="notification-page">
      <div className="notification-page-title-row">
        <h1>
          All Notifications
        </h1>

        <button
          type="button"
          onClick={markAllRead}
          className="notification-mark-all-button"
        >
          Mark All As Read
        </button>
      </div>

      <div className="notification-page-toolbar">
        <div className="notification-tabs notification-page-tabs">
          {tabs.map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setTab(
                    item,
                  );

                  setPage(
                    1,
                  );
                }}
                className={cn(
                  "notification-tab",
                  tab ===
                    item &&
                    "notification-tab-active",
                )}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <label className="notification-search">
          <Search
            size={20}
          />

          <span className="sr-only">
            Search
            notifications
          </span>

          <input
            type="search"
            value={query}
            onChange={(
              event,
            ) => {
              setQuery(
                event
                  .target
                  .value,
              );

              setPage(1);
            }}
            placeholder="Search"
          />
        </label>
      </div>

      <section className="notification-page-table">
        <div className="notification-page-list">
          {visible.map(
            (item) => (
              <NotificationRow
                key={
                  item.id
                }
                item={item}
                onOpen={() =>
                  markRead(
                    item.id,
                  )
                }
              />
            ),
          )}

          {visible.length ===
            0 && (
            <p className="notification-empty">
              No notifications
              match this view.
            </p>
          )}
        </div>

        <footer className="notification-pagination">
          <span className="notification-pagination-count">
            {firstItem} -{" "}
            {lastItem} of{" "}
            {
              filtered.length
            }
          </span>

          <select
            aria-label="Notifications per page"
            value={
              pageSize
            }
            onChange={(
              event,
            ) => {
              setPageSize(
                Number(
                  event
                    .target
                    .value,
                ),
              );

              setPage(1);
            }}
            className="notification-page-size"
          >
            <option
              value={10}
            >
              10 per page
            </option>

            <option
              value={20}
            >
              20 per page
            </option>

            <option
              value={50}
            >
              50 per page
            </option>
          </select>

          <div className="notification-pagination-buttons">
            <button
              type="button"
              aria-label="Previous page"
              disabled={
                currentPage <=
                1
              }
              onClick={() =>
                setPage(
                  Math.max(
                    1,
                    currentPage -
                      1,
                  ),
                )
              }
            >
              <ChevronLeft
                size={20}
              />
            </button>

            <button
              type="button"
              aria-label="Next page"
              disabled={
                currentPage >=
                pageCount
              }
              onClick={() =>
                setPage(
                  Math.min(
                    pageCount,
                    currentPage +
                      1,
                  ),
                )
              }
            >
              <ChevronRight
                size={20}
              />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}