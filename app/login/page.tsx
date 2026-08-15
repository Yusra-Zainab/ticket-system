import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 bg-white">

      <div className="relative z-10 w-full max-w-md">
        {/* App title */}
        <div className="text-center mb-6">
          <h1
            className="text-[#0284C7] font-semibold text-3xl tracking-tight"
            style={{ fontSize: '30px', lineHeight: '38px', fontWeight: 700 }}
          >
            Support Portal
          </h1>
          <p
            className="mt-2"
            style={{ fontSize: '16px', lineHeight: '24px', color: '#475467' }}
          >
            Track tickets, manage priorities, and collaborate with your team in one place.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}