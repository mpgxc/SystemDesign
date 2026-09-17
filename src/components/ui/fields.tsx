import type { ReactNode } from 'react';
import clsx from 'clsx';

interface BaseProps {
  label: string;
  help?: string;
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-slate-800/80 px-3.5 py-3 last:border-b-0">
      <header className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h3>
        {action}
      </header>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  help,
  mono,
}: BaseProps & { value: string; onChange: (value: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        className={clsx('field-input mt-1', mono && 'font-mono text-[12px]')}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {help ? <span className="mt-1 block text-[10px] text-slate-600">{help}</span> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: BaseProps & { value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <textarea
        className="field-input mt-1 resize-y leading-relaxed"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  help,
  allowEmpty = true,
}: BaseProps & { value: string; options: string[]; onChange: (value: string) => void; allowEmpty?: boolean }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <select className="field-input mt-1" value={value} onChange={(event) => onChange(event.target.value)}>
        {allowEmpty ? <option value="">—</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {help ? <span className="mt-1 block text-[10px] text-slate-600">{help}</span> : null}
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  help,
}: BaseProps & { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2 text-left transition hover:border-slate-700"
    >
      <span className="min-w-0">
        <span className="block text-[12px] text-slate-300">{label}</span>
        {help ? <span className="block text-[10px] text-slate-600">{help}</span> : null}
      </span>
      <span
        className={clsx(
          'relative h-[18px] w-8 shrink-0 rounded-full transition',
          checked ? 'bg-sky-500' : 'bg-slate-700',
        )}
      >
        <span
          className={clsx(
            'absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all',
            checked ? 'left-[16px]' : 'left-[2px]',
          )}
        />
      </span>
    </button>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-600">
        {icon}
      </span>
      <p className="text-[13px] font-medium text-slate-400">{title}</p>
      {children ? <div className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600">{children}</div> : null}
    </div>
  );
}
