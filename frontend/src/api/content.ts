export const categories = [
  ['jobs', 'Government jobs', 'Find your next opportunity'],
  ['results', 'Results', 'Check examination results'],
  ['admit-cards', 'Admit cards', 'Get ready for exam day'],
  ['answer-keys', 'Answer keys', 'Review official answers'],
  ['syllabus', 'Syllabus', 'Plan your preparation'],
  ['admissions', 'Admissions', 'Find admission notices and application dates'],
  ['certificate-verification', 'Certificate Verification', 'Find official verification notices and instructions'],
  ['schemes', 'Government schemes', 'Explore citizen benefits'],
] as const;

export interface Content {
  id: number; type: string; slug: string; title: string; summary: string;
  details?: Record<string, string> | null; body?: string; organization: string; source_url: string;
  verified_at: string; published_at: string; updated_at: string;
  closing_date: string | null; locale: string;
}
export interface Page { data: Content[]; meta: { current_page: number; last_page: number; total: number }; }

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(response.status === 404 ? 'This page could not be found.' : 'We could not load the latest updates. Please try again.');
  return response.json() as Promise<T>;
}
