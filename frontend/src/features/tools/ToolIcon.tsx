const paths: Record<string, string> = {
  Images: 'M4 4h16v16H4z M4 16l5-5 4 4 3-3 4 4 M8 8h.01',
  'AI & OCR': 'M4 8V4h4 M16 4h4v4 M20 16v4h-4 M8 20H4v-4 M8 9h8 M12 9v7 M9 16h6',
  Career: 'M8 6V3h8v3 M3 7h18v14H3z M3 12h18 M10 12v3h4v-3',
  Documents: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',
  Media: 'M4 4h16v16H4z M10 8l6 4-6 4z',
  Calculators: 'M6 3h12v18H6z M9 7h6 M9 11h.01 M15 11h.01 M9 15h.01 M15 15h.01 M9 18h.01 M15 18h.01',
};
export default function ToolIcon({ category }: { category: string }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[category] ?? paths.Documents} /></svg>;
}
