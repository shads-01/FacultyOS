import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ background: '#FAF8F3' }}
    >
      <header className="px-4 pt-5">
        <Link href="/login" className="cursor-pointer" style={{ textDecoration: 'none' }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 44, height: 44, background: '#FFD23F', border: '3px solid #111',
              boxShadow: '5px 5px 0 #E11D1D',
              fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: '#111',
            }}
          >
            F.
          </span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-16">{children}</main>
    </div>
  );
}
