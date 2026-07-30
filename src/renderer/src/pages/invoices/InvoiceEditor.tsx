import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFieldArray, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, TextArea, TextField } from '@renderer/components/ui'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import type {
  Business,
  Client,
  Expense,
  InvoiceInput,
  InvoiceStatus,
  ProjectWithClient
} from '@renderer/lib/types'
import { listClients } from '@renderer/lib/db/clients'
import { getBusiness } from '@renderer/lib/db/business'
import { listProjects } from '@renderer/lib/db/projects'
import { setExpensesInvoiced } from '@renderer/lib/db/expenses'
import { createInvoice, getInvoice, updateInvoice } from '@renderer/lib/db/invoices'
import { toNumber, withMarkup } from '@renderer/lib/format'
import { ClientPicker } from './ClientPicker'
import { ExpensePicker } from './ExpensePicker'
import { LineItemsEditor } from './LineItemsEditor'
import { InvoiceSheet, type SheetData } from './InvoiceSheet'
import { invoicePdfName, renderInvoiceHtml } from './invoiceHtml'
import { StatusBadge } from './StatusBadge'
import {
  computeTotals,
  invoiceSchema,
  invoiceToFormValues,
  newInvoiceDefaults,
  type InvoiceFormValues
} from './invoiceForm'

export function InvoiceEditor(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<ProjectWithClient[]>([])
  const [business, setBusiness] = useState<Business | null>(null)
  // Expense ids pulled onto this invoice; marked billed on save.
  const [pendingExpenseIds, setPendingExpenseIds] = useState<string[]>([])
  const [invoiceNo, setInvoiceNo] = useState('')
  const [status, setStatus] = useState<InvoiceStatus>('draft')
  const [saving, setSaving] = useState<InvoiceStatus | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [printing, setPrinting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<InvoiceFormValues>({
    // zod's coerce makes input≠output types; the form values are the coerced
    // output type, so cast the resolver to match. Runtime coercion is correct.
    resolver: zodResolver(invoiceSchema) as Resolver<InvoiceFormValues>,
    defaultValues: newInvoiceDefaults('')
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'items' })

  // Initial load: clients + business, and the invoice itself when editing.
  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [cl, biz, pr] = await Promise.all([listClients(), getBusiness(), listProjects()])
        if (!active) return
        setClients(cl)
        setBusiness(biz)
        setProjects(pr)

        if (id) {
          const inv = await getInvoice(id)
          if (!active) return
          setInvoiceNo(inv.invoice_no)
          setStatus(inv.status)
          reset(invoiceToFormValues(inv))
        } else {
          reset(newInvoiceDefaults(biz?.payable_to_default ?? ''))
        }
      } catch (e) {
        if (active) setLoadError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id, reset])

  const values = watch()
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === values.client_id) ?? null,
    [clients, values.client_id]
  )

  const sheet: SheetData = {
    business,
    clientName: selectedClient?.name ?? '',
    clientAddress: selectedClient?.address ?? '',
    payableTo: values.payable_to ?? '',
    invoiceNo,
    project: values.project ?? '',
    invoiceDate: values.invoice_date ?? '',
    dueDate: values.due_date ?? '',
    items: (values.items ?? []).map((it) => ({
      description: it.description ?? '',
      qty: toNumber(it.qty),
      unit_price: toNumber(it.unit_price)
    })),
    adjustments: toNumber(values.adjustments),
    notes: values.notes ?? ''
  }

  function buildInput(v: InvoiceFormValues, nextStatus: InvoiceStatus): InvoiceInput {
    const { subtotal, total } = computeTotals(v.items, v.adjustments)
    return {
      client_id: v.client_id || null,
      project_id: v.project_id || null,
      payable_to: v.payable_to,
      project: v.project,
      invoice_date: v.invoice_date,
      due_date: v.due_date || null,
      notes: v.notes,
      adjustments: toNumber(v.adjustments),
      subtotal,
      total,
      status: nextStatus,
      items: v.items.map((it) => ({
        description: it.description,
        qty: toNumber(it.qty),
        unit_price: toNumber(it.unit_price)
      }))
    }
  }

  /** After the invoice is saved, mark the pulled-in expenses as billed. */
  async function markPendingExpensesBilled(invoiceId: string): Promise<void> {
    if (pendingExpenseIds.length === 0) return
    await setExpensesInvoiced(pendingExpenseIds, true, invoiceId)
    setPendingExpenseIds([])
  }

  /** Pull selected project expenses onto the invoice as line items, priced at
   *  the billable (cost + markup) amount the client sees. */
  function addExpenses(expenses: Expense[]): void {
    for (const e of expenses) {
      append({
        description: e.description ?? '',
        qty: 1,
        unit_price: withMarkup(Number(e.amount), Number(e.markup_percent))
      })
    }
    setPendingExpenseIds((prev) => [...prev, ...expenses.map((e) => e.id)])
  }

  /** Selecting a project links it, fills the project label (description, not the
   *  code — invoices don't show the code), and sets the client. */
  function onSelectProject(projectId: string): void {
    setValue('project_id', projectId)
    const proj = projects.find((p) => p.id === projectId)
    if (proj) {
      setValue('project', proj.name ?? '')
      if (proj.client_id) setValue('client_id', proj.client_id, { shouldValidate: true })
    }
  }

  function save(nextStatus: InvoiceStatus): void {
    setSaveError(null)
    void handleSubmit(async (v) => {
      setSaving(nextStatus)
      try {
        const input = buildInput(v, nextStatus)
        if (isEdit && id) {
          const updated = await updateInvoice(id, input)
          await markPendingExpensesBilled(updated.id)
          setStatus(updated.status)
          setInvoiceNo(updated.invoice_no)
          setSavedAt(Date.now())
        } else {
          const created = await createInvoice(input)
          await markPendingExpensesBilled(created.id)
          navigate(`/invoices/${created.id}/edit`, { replace: true })
        }
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Failed to save')
      } finally {
        setSaving(null)
      }
    })()
  }

  async function exportPdf(): Promise<void> {
    setSaveError(null)
    setExporting(true)
    try {
      const res = await window.api.pdf.export(renderInvoiceHtml(sheet), invoicePdfName(invoiceNo))
      if (!res.ok && !res.canceled && res.error) setSaveError(res.error)
    } finally {
      setExporting(false)
    }
  }

  async function printInvoice(): Promise<void> {
    setSaveError(null)
    setPrinting(true)
    try {
      const res = await window.api.pdf.print(renderInvoiceHtml(sheet))
      if (!res.ok && res.error) setSaveError(res.error)
    } finally {
      setPrinting(false)
    }
  }

  if (loading) return <FullscreenSpinner label="Loading invoice…" />
  if (loadError)
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          {loadError}
        </div>
      </div>
    )

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-sm text-slate-500 hover:underline">
            ← Dashboard
          </button>
          <h1 className="text-lg font-semibold">
            {isEdit ? `Invoice ${invoiceNo}` : 'New invoice'}
          </h1>
          <StatusBadge status={status} />
          {savedAt && <span className="text-xs text-emerald-600">Saved</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" loading={printing} onClick={() => void printInvoice()}>
            Print
          </Button>
          <Button variant="ghost" loading={exporting} onClick={() => void exportPdf()}>
            Export PDF
          </Button>
          <span className="mx-1 h-5 w-px bg-slate-200" />
          <Button variant="ghost" loading={saving === 'draft'} onClick={() => save('draft')}>
            Save draft
          </Button>
          <Button variant="ghost" loading={saving === 'sent'} onClick={() => save('sent')}>
            Mark sent
          </Button>
          <Button loading={saving === 'paid'} onClick={() => save('paid')}>
            Mark paid
          </Button>
        </div>
      </div>

      {saveError && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {/* Two panes: form (left) + live preview (right) */}
      <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-5 overflow-auto border-r border-slate-200 p-6">
          <ClientPicker
            clients={clients}
            value={values.client_id || null}
            onChange={(cid) => setValue('client_id', cid, { shouldValidate: true })}
            onClientCreated={(c) => setClients((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))}
            error={errors.client_id?.message}
          />

          {/* Bill from project — links the invoice and enables expense pull-in */}
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Bill from project <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <select
              value={values.project_id || ''}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30"
            >
              <option value="">— None —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code}
                  {p.name ? ` · ${p.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          {values.project_id && (
            <ExpensePicker projectId={values.project_id} onAdd={addExpenses} />
          )}

          <div className="grid grid-cols-2 gap-4">
            <TextField label="Payable to" {...register('payable_to')} />
            <TextField label="Project (label)" {...register('project')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Invoice date"
              type="date"
              error={errors.invoice_date?.message}
              {...register('invoice_date')}
            />
            <TextField label="Due date" type="date" {...register('due_date')} />
          </div>

          <LineItemsEditor
            control={control}
            register={register}
            fields={fields}
            onAppend={() => append({ description: '', qty: 1, unit_price: 0 })}
            onRemove={remove}
            onMove={(from, to) => move(from, to)}
          />
          {errors.items && (
            <p className="text-xs text-red-600">
              {errors.items.message ?? 'Check the line items.'}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Adjustments (±)"
              type="number"
              step="any"
              {...register('adjustments')}
            />
          </div>

          <TextArea label="Notes" rows={3} {...register('notes')} />
        </div>

        {/* Live preview */}
        <div className="overflow-auto bg-slate-200/60 p-6">
          <div className="origin-top" style={{ transform: 'scale(0.78)', transformOrigin: 'top center' }}>
            <div className="shadow-xl">
              <InvoiceSheet data={sheet} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
