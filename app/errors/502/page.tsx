import Image from 'next/image';

export default function Error502Page() {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 bg-white">

      <div className="relative z-10 text-center">
        {/* Illustration */}
        <div className="relative w-full max-w-xl mx-auto aspect-4/3">
          <Image
            src="/images/502.png"
            alt="A cat tangled in a ball of yarn, illustrating a 502 server error"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Message */}
        <p
          className="mt-4 w-screen"
          style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 400, color: '#344054', padding: 32 }}
        >
          We&apos;re experiencing a temporary technical issue on our end. This isn&apos;t your
          fault, and our team has been notified and is working to fix it as quickly as possible.
        </p>
      </div>
    </main>
  );
}