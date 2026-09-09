export function LoadingState({ label = 'Loading your workspace' }: { label?: string }) {
  return <div className="loading-state" role="status" aria-live="polite"><p>{label}…</p><div className="skeleton" /><div className="skeleton" /><div className="skeleton short" /></div>;
}

export function Faq({ items }: { items: { question: string; answer: string }[] }) {
  return <section className="product-faq"><h2>Good questions. Clear answers.</h2>{items.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>;
}
