'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import IdentityChip from '@/components/IdentityChip';

const TABS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/exam-quality', label: 'Exam Quality' },
  { href: '/syllabus-overlap', label: 'Syllabus Overlap' },
  { href: '/grader-consistency', label: 'Grader Consistency' },
  { href: '/ai-grading', label: 'AI Grading' },
  { href: '/history', label: 'History' },
];

export default function AppLayout({ children }) {
  const pathname = usePathname();
  return (
    <div className="min-h-[100dvh]">
      <div
        className="flex items-center gap-2 px-4 pt-4"
        style={{ flexWrap: 'wrap' }}
      >
        <nav
          className="flex"
          style={{
            border: '3px solid #111', background: '#fff',
            overflowX: 'auto', maxWidth: '100%',
          }}
          aria-label="Main navigation"
        >
          {TABS.map((tab, i) => {
            const on = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="cursor-pointer font-bold uppercase tracking-wide whitespace-nowrap"
                style={{
                  fontSize: 12.5,
                  padding: '11px 14px',
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRight: i < TABS.length - 1 ? '3px solid #111' : 'none',
                  background: on ? '#111' : '#fff',
                  color: on ? '#FAF8F3' : '#111',
                  textDecoration: 'none',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
          <IdentityChip />
        </div>
      </div>
      <main className="px-4 pb-12 pt-6">{children}</main>
    </div>
  );
}
