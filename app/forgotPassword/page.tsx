import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <div className="auth-background-pattern" aria-hidden="true" />

      <section className="auth-container auth-forgot-container">
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
