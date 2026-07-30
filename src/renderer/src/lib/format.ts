/** Philippine peso, formatted as ₱#,##0.00. Negatives render as -₱1,234.50. */
export function formatPeso(value: number): string {
  const n = Number.isFinite(value) ? value : 0
  const abs = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${n < 0 ? '-' : ''}₱${abs}`
}

/** Billable (client-facing) amount for an expense: cost + markup. */
export function withMarkup(amount: number, markupPercent: number): number {
  return amount * (1 + markupPercent / 100)
}

/** Parse a possibly-messy numeric input into a finite number (0 on failure). */
export function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** yyyy-mm-dd -> mm-dd-yy (template date format). Empty string if no date. */
export function formatTemplateDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const [, yyyy, mm, dd] = m
  return `${mm}-${dd}-${yyyy.slice(2)}`
}

/** Today's date as yyyy-mm-dd in Asia/Manila (matches the DB's invoice_date default). */
export function todayManila(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
  return parts // en-CA yields yyyy-mm-dd
}
