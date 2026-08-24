import { requireAnonymousPage } from "@/lib/auth";

import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await requireAnonymousPage();
  const { token = "" } = await searchParams;

  return (
    <main className="auth-page">
      <div className="auth-background-pattern" aria-hidden="true" />

      <section className="auth-container auth-forgot-container">
        <ResetPasswordForm token={token} />
      </section>
    </main>
  );
}
