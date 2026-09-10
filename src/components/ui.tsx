import type { ReactNode } from 'react'

export const inputCls =
  'bg-surface-container-lowest text-on-surface rounded-lg px-space-md py-space-xs border border-outline-variant font-body-sm text-body-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/40'

const btnBase = 'px-space-md py-space-xs rounded-lg font-label-md text-label-md font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
export const btnPrimary = `${btnBase} bg-primary text-on-primary`
export const btnSecondary = `${btnBase} bg-secondary-container text-on-secondary-fixed-variant`
export const btnGhost = `${btnBase} bg-surface-container text-on-surface-variant hover:bg-surface-container-high`

export function Field({
  label, value, onChange, placeholder, type = 'text', hint, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  hint?: string
  required?: boolean
}) {
  return (
    <label className="flex flex-col gap-space-xxs">
      <span className="font-label-xs text-label-xs text-on-surface-variant font-semibold uppercase tracking-wider">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={inputCls}
      />
      {hint && <span className="font-body-xs text-body-xs text-on-surface-variant">{hint}</span>}
    </label>
  )
}

export function SelField({
  label, value, onChange, options, allowEmpty,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  allowEmpty?: string
}) {
  return (
    <label className="flex flex-col gap-space-xxs">
      <span className="font-label-xs text-label-xs text-on-surface-variant font-semibold uppercase tracking-wider">
        {label}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {allowEmpty !== undefined && <option value="">{allowEmpty}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface-container-lowest rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="p-space-md border-b border-outline-variant/40 flex items-center justify-between gap-space-sm">
      <div className="min-w-0">
        <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">{title}</h3>
        {sub && <p className="font-body-xs text-body-xs text-on-surface-variant">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  icon, label, value, sub, color = 'text-primary',
}: {
  icon: string
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-surface-container p-space-md rounded-lg">
      <span className={`material-symbols-outlined flex items-center justify-center w-10 h-10 rounded-lg bg-surface-container-highest ${color} mb-space-sm`}>
        {icon}
      </span>
      <p className="font-body-sm text-body-sm text-on-surface-variant">{label}</p>
      <p className="font-label-lg text-label-lg text-on-surface font-bold">{value}</p>
      {sub && <p className="font-body-xs text-body-xs text-on-surface-variant">{sub}</p>}
    </div>
  )
}

export function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`px-space-xs py-px rounded-full font-label-xs text-label-xs font-bold whitespace-nowrap ${className}`}>
      {children}
    </span>
  )
}

export function Tabs<T extends string>({
  tabs, value, onChange,
}: { tabs: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-space-xs flex-wrap">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-space-md py-space-xs rounded-lg font-label-md text-label-md font-bold transition-colors ${
            value === t.key
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function PageHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <section className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
      <div className="flex items-center gap-space-sm">
        <span className="material-symbols-outlined text-3xl text-primary">{icon}</span>
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold">{title}</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{sub}</p>
        </div>
      </div>
    </section>
  )
}

export function Notif({ pesan, onClear, tipe = 'error' }: { pesan: string; onClear: () => void; tipe?: 'error' | 'info' }) {
  return (
    <div
      className={`px-space-md py-space-xs rounded-lg font-body-sm text-body-sm flex items-center justify-between gap-space-sm ${
        tipe === 'error' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-fixed-variant'
      }`}
    >
      <span>{pesan}</span>
      <button onClick={onClear} className="font-bold px-1" aria-label="Tutup">
        ×
      </button>
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return <p className="py-space-md text-center text-on-surface-variant italic font-body-sm text-body-sm">{text}</p>
}