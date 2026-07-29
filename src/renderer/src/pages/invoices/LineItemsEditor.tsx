import { useWatch, type Control, type UseFormRegister } from 'react-hook-form'
import { formatPeso, toNumber } from '@renderer/lib/format'
import type { InvoiceFormValues } from './invoiceForm'

type Props = {
  control: Control<InvoiceFormValues>
  register: UseFormRegister<InvoiceFormValues>
  fields: { id: string }[]
  onAppend: () => void
  onRemove: (index: number) => void
  onMove: (from: number, to: number) => void
}

export function LineItemsEditor({
  control,
  register,
  fields,
  onAppend,
  onRemove,
  onMove
}: Props): JSX.Element {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Line items</span>
        <button
          type="button"
          onClick={onAppend}
          className="text-sm font-medium text-brand-accent hover:underline"
        >
          + Add row
        </button>
      </div>

      <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2 text-left font-medium">Description</th>
              <th className="w-16 px-2 py-2 text-right font-medium">Qty</th>
              <th className="w-28 px-2 py-2 text-right font-medium">Unit price</th>
              <th className="w-28 px-2 py-2 text-right font-medium">Total</th>
              <th className="w-20 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fields.map((field, index) => (
              <Row
                key={field.id}
                index={index}
                control={control}
                register={register}
                canRemove={fields.length > 1}
                isFirst={index === 0}
                isLast={index === fields.length - 1}
                onRemove={() => onRemove(index)}
                onMoveUp={() => onMove(index, index - 1)}
                onMoveDown={() => onMove(index, index + 1)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type RowProps = {
  index: number
  control: Control<InvoiceFormValues>
  register: UseFormRegister<InvoiceFormValues>
  canRemove: boolean
  isFirst: boolean
  isLast: boolean
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function Row({
  index,
  control,
  register,
  canRemove,
  isFirst,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown
}: RowProps): JSX.Element {
  // Watch just this row's numeric fields to show its live total.
  const qty = useWatch({ control, name: `items.${index}.qty` })
  const unitPrice = useWatch({ control, name: `items.${index}.unit_price` })
  const total = toNumber(qty) * toNumber(unitPrice)

  const cell =
    'w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/30'

  return (
    <tr className="align-top">
      <td className="px-2 py-1.5">
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
      <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">{formatPeso(total)}</td>
      <td className="px-2 py-1.5">
        <div className="flex items-center justify-end gap-1 text-slate-400">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            title="Move up"
            className="rounded px-1 hover:bg-slate-100 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            title="Move down"
            className="rounded px-1 hover:bg-slate-100 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            title="Remove row"
            className="rounded px-1 text-red-500 hover:bg-red-50 disabled:opacity-30"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  )
}
