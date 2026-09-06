export default function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand-lockup"><svg viewBox="0 0 48 48" width="42" height="42" fill="none" aria-hidden="true"><rect width="48" height="48" rx="14" fill="#155EEF" /><path d="M29 13h-9a7 7 0 0 0 0 14h8a4 4 0 0 1 0 8H17" stroke="white" strokeWidth="4.5" strokeLinecap="round" /><path d="M33 8v8m-4-4h8" stroke="#79E5CE" strokeWidth="3" strokeLinecap="round" /></svg>{!compact && <span><strong>SarkariLinks</strong><small>Opportunities. Tools. You.</small></span>}</span>;
}
