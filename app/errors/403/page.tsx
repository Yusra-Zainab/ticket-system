import Image from 'next/image';

export default function Error403Page() {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 bg-white">

      <div className="relative z-10 text-center">
        {/* Illustration */}
        <div className="relative w-full max-w-xl mx-auto aspect-4/3">
          <Image
            src="/images/403.png"
            alt="A cat tangled in a ball of yarn, illustrating a 502 server error"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Message */}
        <p
          className="mt-4 w-screen"
          style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 400, color: '#344054', padding : 32 }}
        >
          You don&apos;t have permission to view this page. This might be because the content is private, or you need to be logged in to access it.
        </p>
      </div>
    </main>
  );
}