export default function ResourceNotificationStyles() {
  return (
    <style>{`
      .resource-portal-shell .notification-popover-dismiss {
        position: fixed;
        inset: 0;
        z-index: 70;
        border: 0;
        background: rgb(15 23 42 / 0.18);
        cursor: default;
      }

      .resource-portal-shell .notification-popover {
        position: fixed;
        left: 50%;
        bottom: 88px;
        z-index: 80;
        display: flex;
        width: min(420px, calc(100vw - 24px));
        max-height: min(70vh, 560px);
        transform: translateX(-50%);
        flex-direction: column;
        overflow: hidden;
        border: 1px solid #e4e7ec;
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 24px 60px rgb(16 24 40 / 0.2);
      }

      .resource-portal-shell .notification-popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid #eaecf0;
        padding: 16px 18px 14px;
      }

      .resource-portal-shell .notification-popover-header h2 {
        margin: 0;
        color: #101828;
        font-size: 18px;
        font-weight: 700;
        line-height: 28px;
      }

      .resource-portal-shell .notification-text-button {
        border: 0;
        background: transparent;
        padding: 0;
        color: #0284c7;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
      }

      .resource-portal-shell .notification-text-button:hover {
        color: #0369a1;
      }

      .resource-portal-shell .notification-tabs {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        border-bottom: 1px solid #eaecf0;
        padding: 10px 14px;
        scrollbar-width: none;
      }

      .resource-portal-shell .notification-tabs::-webkit-scrollbar {
        display: none;
      }

      .resource-portal-shell .notification-tab {
        flex: none;
        border: 1px solid #e4e7ec;
        border-radius: 999px;
        background: #ffffff;
        padding: 6px 12px;
        color: #475467;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }

      .resource-portal-shell .notification-tab:hover {
        color: #344054;
      }

      .resource-portal-shell .notification-tab-active {
        border-color: #b9e6fe;
        background: #f0f9ff;
        color: #026aa2;
      }

      .resource-portal-shell .notification-popover-list {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 10px 12px;
      }

      .resource-portal-shell .notification-row {
        display: flex;
        gap: 12px;
        border-radius: 14px;
        padding: 12px;
        color: inherit;
        text-decoration: none;
        transition: background-color 0.15s ease;
      }

      .resource-portal-shell .notification-row:hover {
        background: #f8fafc;
      }

      .resource-portal-shell .notification-row-unread {
        background: #f0f9ff;
      }

      .resource-portal-shell .notification-row-compact + .notification-row-compact {
        margin-top: 8px;
      }

      .resource-portal-shell .notification-row-icon {
        display: grid;
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        place-items: center;
        color: #0284c7;
      }

      .resource-portal-shell .notification-row-copy {
        min-width: 0;
        flex: 1;
      }

      .resource-portal-shell .notification-row-topline {
        display: flex;
        min-width: 0;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      .resource-portal-shell .notification-row-title-wrap {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 8px;
      }

      .resource-portal-shell .notification-row-title {
        overflow: hidden;
        color: #101828;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .resource-portal-shell .notification-new-badge {
        display: inline-flex;
        flex: none;
        border-radius: 999px;
        background: #ecfdf3;
        padding: 2px 8px;
        color: #067647;
        font-size: 11px;
        font-weight: 600;
        line-height: 16px;
      }

      .resource-portal-shell .notification-row-time {
        flex: none;
        color: #98a2b3;
        font-size: 12px;
        line-height: 18px;
        white-space: nowrap;
      }

      .resource-portal-shell .notification-row-body {
        display: block;
        margin-top: 4px;
        overflow: hidden;
        color: #475467;
        font-size: 13px;
        line-height: 20px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .resource-portal-shell .notification-empty {
        margin: 0;
        padding: 28px 12px;
        color: #667085;
        font-size: 14px;
        line-height: 20px;
        text-align: center;
      }

      .resource-portal-shell .notification-popover-footer {
        display: flex;
        justify-content: center;
        border-top: 1px solid #eaecf0;
        padding: 12px 18px 16px;
      }

      .resource-portal-shell .notification-page {
        display: flex;
        width: 100%;
        flex-direction: column;
        gap: 24px;
      }

      .resource-portal-shell .notification-page-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .resource-portal-shell .notification-page-title-row h1 {
        margin: 0;
        color: #101828;
        font-family: Satoshi, var(--font-inter), Inter, sans-serif;
        font-size: 30px;
        font-weight: 700;
        line-height: 38px;
      }

      .resource-portal-shell .notification-mark-all-button {
        display: inline-flex;
        min-height: 40px;
        align-items: center;
        justify-content: center;
        border: 1px solid #06b6d4;
        border-radius: 8px;
        background: #ffffff;
        padding: 10px 14px;
        color: #0284c7;
        font: inherit;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
        box-shadow: 0 1px 2px rgb(16 24 40 / 0.05);
        cursor: pointer;
      }

      .resource-portal-shell .notification-mark-all-button:hover {
        background: #f0fbfd;
      }

      .resource-portal-shell .notification-page-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 16px;
      }

      .resource-portal-shell .notification-page-tabs {
        min-width: 0;
        flex: 1 1 auto;
        padding: 0 0 10px;
      }

      .resource-portal-shell .notification-search {
        display: flex;
        width: min(320px, 100%);
        min-height: 44px;
        align-items: center;
        gap: 8px;
        border: 1px solid #d0d5dd;
        border-radius: 8px;
        background: #ffffff;
        padding: 10px 14px;
        box-shadow: 0 1px 2px rgb(16 24 40 / 0.05);
      }

      .resource-portal-shell .notification-search svg {
        flex: none;
        color: #667085;
      }

      .resource-portal-shell .notification-search input {
        width: 100%;
        min-width: 0;
        border: 0;
        background: transparent;
        color: #344054;
        font: inherit;
        font-size: 16px;
        line-height: 24px;
        outline: none;
      }

      .resource-portal-shell .notification-search input::placeholder {
        color: #98a2b3;
      }

      .resource-portal-shell .notification-page-table {
        overflow: hidden;
        border: 1px solid #eaecf0;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 1px 2px rgb(16 24 40 / 0.05);
      }

      .resource-portal-shell .notification-page-list {
        display: flex;
        flex-direction: column;
        padding: 0 12px;
      }

      .resource-portal-shell .notification-page-list .notification-row {
        border-radius: 0;
        border-bottom: 1px solid #eaecf0;
        padding: 18px 12px;
      }

      .resource-portal-shell .notification-page-list .notification-row:last-of-type {
        border-bottom: 0;
      }

      .resource-portal-shell .notification-pagination {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        border-top: 1px solid #eaecf0;
        padding: 12px 24px;
      }

      .resource-portal-shell .notification-pagination-count {
        color: #475467;
        font-size: 14px;
        line-height: 20px;
      }

      .resource-portal-shell .notification-page-size {
        min-height: 36px;
        border: 1px solid #d0d5dd;
        border-radius: 8px;
        background: #ffffff;
        padding: 8px 12px;
        color: #344054;
        font: inherit;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
        box-shadow: 0 1px 2px rgb(16 24 40 / 0.05);
      }

      .resource-portal-shell .notification-pagination-buttons {
        display: flex;
        overflow: hidden;
        border: 1px solid #d0d5dd;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 1px 2px rgb(16 24 40 / 0.05);
      }

      .resource-portal-shell .notification-pagination-buttons button {
        display: grid;
        width: 36px;
        height: 36px;
        place-items: center;
        border: 0;
        background: #ffffff;
        color: #344054;
        cursor: pointer;
      }

      .resource-portal-shell .notification-pagination-buttons button + button {
        border-left: 1px solid #d0d5dd;
      }

      .resource-portal-shell .notification-pagination-buttons button:hover:not(:disabled) {
        background: #f9fafb;
      }

      .resource-portal-shell .notification-pagination-buttons button:disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }

      @media (max-width: 768px) {
        .resource-portal-shell .notification-page-title-row {
          align-items: stretch;
          flex-direction: column;
        }

        .resource-portal-shell .notification-mark-all-button,
        .resource-portal-shell .notification-search {
          width: 100%;
        }

        .resource-portal-shell .notification-page-toolbar {
          align-items: stretch;
          flex-direction: column;
        }

        .resource-portal-shell .notification-page-tabs {
          width: 100%;
        }

        .resource-portal-shell .notification-pagination {
          justify-content: space-between;
          padding: 12px 16px;
        }
      }

      @media (max-width: 520px) {
        .resource-portal-shell .notification-popover {
          bottom: 84px;
        }

        .resource-portal-shell .notification-row-topline {
          align-items: flex-start;
          flex-direction: column;
          gap: 4px;
        }

        .resource-portal-shell .notification-row-time {
          margin-left: 0;
        }
      }
    `}</style>
  );
}