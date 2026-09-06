const paths: Record<string, string> = {
  jobs: 'M8 6V4h8v2M3 7h18v13H3zM3 11l9 4 9-4M10 13h4v4h-4z',
  results: 'M6 3h12v18H6zM9 12l2 2 4-4M9 6h6M9 18h6',
  'admit-cards': 'M3 5h18v15H3zM7 9h3v4H7zM14 9h4M14 13h4M7 17h11',
  'answer-keys': 'M5 3h14v18H5zM8 7h8M8 11h5M8 15l2 2 5-5',
  syllabus: 'M4 4h7l1 2 1-2h7v16h-7l-1 1-1-1H4zM12 6v15M7 8h2M15 8h2M7 12h2M15 12h2',
  schemes: 'M3 9l9-6 9 6zM5 10v8M10 10v8M14 10v8M19 10v8M3 21h18M3 18h18',
  calendar: 'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 14h2v3H8z',
  calculator: 'M5 3h14v18H5zM8 6h8v4H8zM8 14h1M12 14h1M16 14h1M8 18h1M12 18h1M16 18h1',
  image: 'M3 4h18v16H3zM3 17l6-6 4 4 3-3 5 5M15 8h1',
  keyboard: 'M2 6h20v13H2zM5 10h1M9 10h1M13 10h1M17 10h1M5 14h1M9 14h9',
  search: 'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
};

export default function Icon({ name }: { name: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.jobs} /></svg>;
}
