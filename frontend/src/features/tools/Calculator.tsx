import { useState, type FormEvent } from 'react';
import type { PortalTool } from './Tools';
export default function Calculator({ tool }: { tool: PortalTool }) {
  const [result, setResult] = useState(''), [invalid, setInvalid] = useState(false);
  const details = tool.slug === 'age' ? { title: 'Enter your dates', hint: 'Use the cut-off date stated in the official notice.', result: 'Your completed age', note: 'Age relaxation and eligibility depend on the issuing authority.' } : tool.slug === 'percentage' ? { title: 'Enter your marks', hint: 'Use marks obtained and the maximum possible marks.', result: 'Your percentage', note: 'Check the official notice for rounding and eligibility rules.' } : { title: 'Enter loan details', hint: 'Use the fixed annual rate and repayment period in months.', result: 'Estimated monthly payment', note: 'This estimate excludes fees and lender-specific charges.' };
  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInvalid(false);
    const form = new FormData(event.currentTarget);
    if (tool.slug === 'age') {
      const birth = new Date(String(form.get('birth')) + 'T00:00:00Z');
      const cutoff = new Date(String(form.get('cutoff')) + 'T00:00:00Z');
      if (birth > cutoff) { setInvalid(true); setResult('The cut-off date must be on or after the date of birth.'); return; }
      let years = cutoff.getUTCFullYear() - birth.getUTCFullYear();
      if (cutoff.getUTCMonth() < birth.getUTCMonth() || (cutoff.getUTCMonth() === birth.getUTCMonth() && cutoff.getUTCDate() < birth.getUTCDate())) years--;
      setResult(`${years} completed years on the selected cut-off date.`);
    } else if (tool.slug === 'percentage') {
      const marks = Number(form.get('marks')), maximum = Number(form.get('maximum'));
      setInvalid(marks > maximum);
      setResult(marks > maximum ? 'Marks obtained cannot exceed maximum marks.' : `${(marks / maximum * 100).toFixed(2)}%`);
    } else {
      const principal = Number(form.get('principal')), rate = Number(form.get('rate')) / 1200, months = Number(form.get('months'));
      const payment = rate === 0 ? principal / months : principal * rate / (1 - (1 + rate) ** -months);
      setResult(`${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(payment)} per month`);
    }
  }
  return <div className="calculator-workspace" id={tool.slug}>
    <section className="panel calculator-input"><div className="tool-panel-heading"><span className="tool-step" aria-hidden="true">01</span><div><h2>{details.title}</h2><p>{details.hint}</p></div></div>
    <form onSubmit={calculate} onChange={() => { setResult(''); setInvalid(false); }} onReset={() => { setResult(''); setInvalid(false); }}>
{tool.slug === 'age' ? <><label>Date of birth<input type="date" name="birth" required /></label><label>Cut-off date<input type="date" name="cutoff" required /></label></> : tool.slug === 'percentage' ? <><label>Marks obtained<input type="number" name="marks" required min="0" max="10000000" step="any" /></label><label>Maximum marks<input type="number" name="maximum" required min="0.01" max="10000000" step="any" /></label></> : <><label>Loan amount (₹)<input type="number" name="principal" min="1" max="1000000000" required /></label><label>Annual interest rate (%)<input type="number" name="rate" min="0" max="100" step="0.01" required /></label><label>Number of monthly payments<input type="number" name="months" min="1" max="600" required /></label></>}<div className="calculator-actions"><button>Calculate</button><button type="reset" className="secondary">Clear inputs</button></div></form></section>
    <section className={`panel calculator-result ${invalid ? 'has-error' : ''}`} aria-labelledby={`${tool.slug}-result-title`}><div className="tool-panel-heading"><span className="tool-step" aria-hidden="true">02</span><div><h2 id={`${tool.slug}-result-title`}>{details.result}</h2><p>Calculated locally on your device.</p></div></div><div className="calculator-result-body"><span className="eyebrow">{invalid ? 'CHECK YOUR INPUTS' : result ? 'CALCULATION COMPLETE' : 'READY WHEN YOU ARE'}</span><output aria-live="polite" aria-atomic="true">{result}</output>{!result && <><h3>Your result will appear here</h3><p>Enter the details and select Calculate.</p></>}<p className="calculator-result-note">{details.note}</p></div></section>
  </div>;
}
