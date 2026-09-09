const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
export function deadlineStatus(value: string, now = new Date()) {
  const day = value.slice(0, 10);
  const parts = calendar.formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const remaining = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (!Number.isFinite(remaining)) return null;
  const label = remaining < 0 ? 'Closed' : remaining === 0 ? 'Closes today' : remaining === 1 ? 'Closes tomorrow' : remaining <= 7 ? `Closes in ${remaining} days` : 'Closing date';
  return { day, label, tone: remaining < 0 ? 'closed' : remaining <= 7 ? 'urgent' : 'upcoming' };
}
export default function Deadline({ value }: { value: string }) {
  const status = deadlineStatus(value);
  if (!status) return null;
  return <span className={`deadline-badge deadline-${status.tone}`}><span>{status.label}</span><span aria-hidden="true"> &middot; </span><time dateTime={status.day}>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${status.day}T00:00:00Z`))}</time></span>;
}
