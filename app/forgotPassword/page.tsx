import { requireAnonymousPage } from "@/lib/auth";

import ForgotPasswordForm from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  await requireAnonymousPage();

  return (
    <main className="auth-page">
      <div className="auth-background-pattern" aria-hidden="true" />

      <section className="auth-container auth-forgot-container">
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
