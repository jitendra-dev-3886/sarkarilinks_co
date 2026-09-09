import { useId } from 'react';
interface Props { label: string; value: string; options: string[][]; onChange: (value: string) => void; name?: string; disabled?: boolean; }
export default function ChoiceSwitch({ label, value, options, onChange, name, disabled }: Props) {
  const id = useId();
  return <fieldset className="resume-choice" disabled={disabled}><legend>{label}</legend><div className="resume-segments">{options.map(([key, title]) => <label key={key} className={value === key ? 'is-selected' : ''}><input type="radio" name={name ?? id} value={key} checked={value === key} onChange={() => onChange(key)} /><span>{title}</span></label>)}</div></fieldset>;
}
