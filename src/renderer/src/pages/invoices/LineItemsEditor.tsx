import { Fragment } from 'react'
import {
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue
} from 'react-hook-form'
import { formatPeso } from '@renderer/lib/format'
import { effectiveUnitPrice, groupByCategory, type InvoiceFormValues } from './invoiceForm'

type Props = {
  control: Control<InvoiceFormValues>
  register: UseFormRegister<InvoiceFormValues>
  setValue: UseFormSetValue<InvoiceFormValues>
  fields: { id: string }[]
  /** Invoice-wide markup %, added on top of each line's own markup. */
  globalMarkup: number
  /** Append a blank line; optionally seeded with a category. */
  onAppend: (category?: string) => void
  onRemove: (index: number) => void
}

/**
 * Line items grouped by category, matching the invoice preview. The category is
 * edited once, on the bold group header (renaming it re-tags every item in the
 * group); each row underneath is just the item. Every row of a category
 * collapses under one header, even if the underlying order is interleaved.
 */
export function LineItemsEditor({
  control,
  register,
  setValue,
  fields,
  globalMarkup,
  onAppend,
  onRemove
}: Props): JSX.Element {
  // Live category values, matched to their field-array index.
  const watchedItems = useWatch({ control, name: 'items' }) as { category?: string }[] | undefined
  const entries = fields.map((f, index) => ({
    id: f.id,
    index,
    category: (watchedItems?.[index]?.category ?? '').trim()
  }))
  const groups = groupByCategory(entries)
  const canRemove = fields.length > 1

  function renameGroup(items: { index: number }[], name: string): void {
    for (const it of items) setValue(`items.${it.index}.category`, name)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Line items</span>
        <button
          type="button"
          onClick={() => onAppend('')}
          className="text-sm font-medium text-brand-accent hover:underline"
        >
          + Add line
        </button>
      </div>

      <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2 text-left font-medium">Description</th>
              <th className="w-14 px-2 py-2 text-right font-medium">Qty</th>
              <th className="w-24 px-2 py-2 text-right font-medium">Unit price</th>
              <th className="w-16 px-2 py-2 text-right font-medium">+%</th>
              <th className="w-24 px-2 py-2 text-right font-medium">Total</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map((group) => (
              <Fragment key={group.items[0].id}>
                <tr className="bg-slate-50/70">
                  <td colSpan={6} className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        value={group.category}
                        placeholder="Uncategorized — name this group…"
                        onChange={(e) => renameGroup(group.items, e.target.value)}
                        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-1 text-sm font-bold text-brand-accent outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => onAppend(group.category)}
                        className="flex-shrink-0 text-xs font-medium text-brand-accent hover:underline"
                      >
                        + Add item
                      </button>
                    </div>
                  </td>
                </tr>
                {group.items.map((entry) => (
                  <Row
                    key={entry.id}
                    index={entry.index}
                    control={control}
                    register={register}
                    globalMarkup={globalMarkup}
                    canRemove={canRemove}
                    onRemove={() => onRemove(entry.index)}
                  />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Total = qty × unit price × (1 + global% + line%). Markup is baked into the price the client
        sees.
      </p>
    </div>
  )
}

type RowProps = {
  index: number
  control: Control<InvoiceFormValues>
  register: UseFormRegister<InvoiceFormValues>
  globalMarkup: number
  canRemove: boolean
  onRemove: () => void
}

function Row({ index, control, register, globalMarkup, canRemove, onRemove }: RowProps): JSX.Element {
  // Watch this row's numeric fields to show its live marked-up total.
  const qty = useWatch({ control, name: `items.${index}.qty` })
  const unitPrice = useWatch({ control, name: `items.${index}.unit_price` })
  const lineMarkup = useWatch({ control, name: `items.${index}.markup_percent` })
  const total = Number(qty || 0) * effectiveUnitPrice(unitPrice, lineMarkup, globalMarkup)

  const cell =
    'w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/30'

  return (
    <tr className="align-top">
      <td className="py-1.5 pl-5 pr-2">
        <input className={cell} placeholder="Item description" {...register(`items.${index}.description`)} />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="any"
          min="0"
          className={`${cell} text-right`}
          {...register(`items.${index}.qty`)}
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="any"
          min="0"
          className={`${cell} text-right`}
          {...register(`items.${index}.unit_price`)}
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="any"
          min="0"
          title="Per-line markup %"
          className={`${cell} text-right`}
          {...register(`items.${index}.markup_percent`)}
        />
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">{formatPeso(total)}</td>
      <td className="px-2 py-1.5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            title="Remove row"
            aria-label="Remove row"
            className="rounded px-1 text-red-500 hover:bg-red-50 disabled:opacity-30"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  )
}
