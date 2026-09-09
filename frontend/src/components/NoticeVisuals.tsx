const icons: Record<string, string> = {
  jobs: 'M8 6V3h8v3M3 7h18v14H3zM3 12h18M10 12v3h4v-3',
  results: 'M8 3h8v4H8zM8 5H4v16h16V5h-4M8 12h8M8 16h5',
  'admit-cards': 'M3 5h18v14H3zM7 9h3v4H7zM14 9h4M14 13h4M7 16h11',
  'answer-keys': 'M8 3h8v4H8zM8 5H4v16h16V5h-4M8 13l3 3 5-6',
  syllabus: 'M12 5v16M12 5C8 2 4 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-2-1-6-2-10 1',
  admissions: 'm2 8 10-5 10 5-10 5zM6 10v7c4 3 8 3 12 0v-7M22 8v9',
  'certificate-verification': 'M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6zM8 12l3 3 5-6',
  tools: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
};
export function CategoryIcon({ category }: { category: string }) {
  return <svg className="mobile-category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[category] ?? icons.jobs} /></svg>;
}
export function isNewNotice(published: string, now = Date.now()) {
  const age = now - Date.parse(published);
  return Number.isFinite(age) && age >= 0 && age < 48 * 60 * 60 * 1000;
}
export function NewNotice({ published }: { published: string }) {
  return isNewNotice(published) ? <span className="mobile-new-notice" title="Published within the last 48 hours">New</span> : null;
}
