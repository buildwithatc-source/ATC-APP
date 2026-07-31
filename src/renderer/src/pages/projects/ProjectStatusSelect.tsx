import type { ProjectStatus } from '@renderer/lib/types'

const STATUSES: ProjectStatus[] = ['active', 'complete', 'archived']

const tone: Record<ProjectStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  complete: 'bg-blue-50 text-blue-700 ring-blue-200',
  archived: 'bg-slate-100 text-slate-500 ring-slate-200'
}

type Props = {
  value: ProjectStatus
  busy?: boolean
  onChange: (status: ProjectStatus) => void
}

/** Compact inline status transition control for a project. */
export function ProjectStatusSelect({ value, busy, onChange }: Props): JSX.Element {
  return (
    <select
      value={value}
      disabled={busy}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as ProjectStatus)}
      className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 outline-none disabled:opacity-60 ${tone[value]}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="bg-white capitalize text-slate-900">
          {s}
        </option>
      ))}
    </select>
  )
}
