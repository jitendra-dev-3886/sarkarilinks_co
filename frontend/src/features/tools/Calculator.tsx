import { useState, type FormEvent } from 'react';
import type { PortalTool } from './Tools';
export default function Calculator({ tool }: { tool: PortalTool }) {
  const [result, setResult] = useState('');
  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (tool.slug === 'age') {
      const birth = new Date(String(form.get('birth')) + 'T00:00:00Z');
      const cutoff = new Date(String(form.get('cutoff')) + 'T00:00:00Z');
      if (birth > cutoff) { setResult('The cut-off date must be on or after the date of birth.'); return; }
      let years = cutoff.getUTCFullYear() - birth.getUTCFullYear();
      if (cutoff.getUTCMonth() < birth.getUTCMonth() || (cutoff.getUTCMonth() === birth.getUTCMonth() && cutoff.getUTCDate() < birth.getUTCDate())) years--;
      setResult(`${years} completed years on the selected cut-off date.`);
    } else if (tool.slug === 'percentage') {
      const marks = Number(form.get('marks')), maximum = Number(form.get('maximum'));
      setResult(marks > maximum ? 'Marks obtained cannot exceed maximum marks.' : `${(marks / maximum * 100).toFixed(2)}%`);
    } else {
      const principal = Number(form.get('principal')), rate = Number(form.get('rate')) / 1200, months = Number(form.get('months'));
      const payment = rate === 0 ? principal / months : principal * rate / (1 - (1 + rate) ** -months);
      setResult(`${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(payment)} per month`);
    }
  }
  return <article className="panel calculator" id={tool.slug}><span className="eyebrow">PRIVATE · INSTANT</span><h2>{tool.name}</h2><p>{tool.help}</p><form onSubmit={calculate} onChange={() => setResult('')}>{tool.slug === 'age' ? <><label>Date of birth<input type="date" name="birth" required /></label><label>Cut-off date<input type="date" name="cutoff" required /></label></> : tool.slug === 'percentage' ? <><label>Marks obtained<input type="number" name="marks" required min="0" max="10000000" step="any" /></label><label>Maximum marks<input type="number" name="maximum" required min="0.01" max="10000000" step="any" /></label></> : <><label>Loan amount (₹)<input type="number" name="principal" min="1" max="1000000000" required /></label><label>Annual interest rate (%)<input type="number" name="rate" min="0" max="100" step="0.01" required /></label><label>Number of monthly payments<input type="number" name="months" min="1" max="600" required /></label></>}<button>Calculate</button><output aria-live="polite">{result}</output></form></article>;
}
