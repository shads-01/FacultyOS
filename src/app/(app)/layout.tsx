'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/exam-quality', label: 'Exam Quality' },
  { href: '/syllabus-overlap', label: 'Syllabus Overlap' },
  { href: '/grader-consistency', label: 'Grader Consistency' },
  { href: '/ai-grading', label: 'AI Grading' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-[100dvh]">
      <nav className="mx-6 mt-6 inline-flex flex-wrap border-3 border-ink" style={{ borderWidth: 3, borderColor: '#111' }}>
        {TABS.map((tab, i) => {
          const on = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="cursor-pointer font-bold uppercase tracking-wide"
              style={{
                fontSize: 12.5,
                padding: '11px 16px',
                borderRight: i < TABS.length - 1 ? '3px solid #111' : 'none',
                background: on ? '#111' : '#FAF8F3',
                color: on ? '#FAF8F3' : '#111',
                textDecoration: 'none',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <main className="px-6 pb-12 pt-6">{children}</main>
    </div>
  );
}
