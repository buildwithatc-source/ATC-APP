import type { InvoiceStatus } from '@renderer/lib/types'

const styles: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  void: 'bg-red-100 text-red-700'
}

export function StatusBadge({ status }: { status: InvoiceStatus }): JSX.Element {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  )
}
