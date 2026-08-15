import Image from 'next/image';

export default function Error404Page() {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 bg-white">

      <div className="relative z-10 w-full max-w-2xl text-center">
        {/* Illustration */}
        <div className="relative w-full max-w-md mx-auto aspect-4/3">
          <Image
            src="/images/404.png"
            alt="A cat tangled in a ball of yarn, illustrating a 502 server error"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Message */}
        <p
          className="mt-4 max-w-xl mx-auto"
          style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 400, color: '#344054' }}
        >
          The page you are looking for doesn&apos;t exists
        </p>
      </div>
    </main>
  );
}