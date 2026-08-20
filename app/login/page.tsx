import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-background-pattern" aria-hidden="true" />

      <section className="auth-container">
        <div className="auth-content">
          <header className="auth-header">
            <h1 className="auth-title">Support Portal</h1>

            <p className="auth-description">
              Track tickets, manage priorities, and collaborate with your team
              in one place.
            </p>
          </header>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
