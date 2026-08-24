import ClientPortalShell from "@/components/client-portal/ClientPortalShell";
import { requireClientPageSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClientPageSession();
  return (
    <>
      <style>{`
.cp-shell{min-height:100vh;background:#fff;color:#101828;font-family:var(--font-inter),Inter,Arial,sans-serif}.cp-shell-topbar{height:64px;border-bottom:1px solid #eaecf0;display:flex;align-items:center;justify-content:space-between;padding:0 32px;position:sticky;top:0;background:rgba(255,255,255,.96);backdrop-filter:blur(10px);z-index:40}.cp-brand{display:flex;align-items:center;gap:10px;font-weight:800;color:#101828;text-decoration:none}.cp-brand-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;color:#fff;background:linear-gradient(66.43deg,#0284c7 12.82%,#06b6d4 47.68%,#22d3ee 82.54%)}.cp-shell-user{display:flex;align-items:center;gap:12px;font-size:14px;font-weight:600}.cp-icon-button{width:36px;height:36px;display:grid;place-items:center;border:1px solid #d0d5dd;background:#fff;border-radius:8px;color:#344054;cursor:pointer}.cp-shell-main{max-width:1440px;margin:0 auto;padding-bottom:120px}.cp-dock{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);display:flex;gap:4px;padding:8px;background:#fff;border:1px solid #e4e7ec;border-radius:16px;box-shadow:0 14px 36px rgba(16,24,40,.16);z-index:50}.cp-dock-link{min-width:76px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 10px;border-radius:10px;text-decoration:none;color:#667085;font-size:11px;font-weight:700}.cp-dock-link.is-active,.cp-dock-link:hover{background:#e6f8fb;color:#0284c7}@media(max-width:720px){.cp-shell-topbar{padding:0 16px}.cp-shell-user>span{display:none}.cp-dock{width:calc(100% - 24px);overflow:auto;justify-content:flex-start}.cp-dock-link{min-width:66px}.cp-shell-main{padding-bottom:130px}}
`}</style>
      <ClientPortalShell userName={user.name}>{children}</ClientPortalShell>
    </>
  );
}
