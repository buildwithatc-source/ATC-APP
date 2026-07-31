import { formatPeso, formatTemplateDate } from '@renderer/lib/format'
import type { SheetData } from './InvoiceSheet'

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** A filesystem-safe suggested filename for the PDF. */
export function invoicePdfName(invoiceNo: string): string {
  const base = invoiceNo ? `Invoice-${invoiceNo}` : 'Invoice-draft'
  return `${base.replace(/[^\w.-]+/g, '_')}.pdf`
}

/**
 * Build a fully self-contained A4 HTML document for the invoice. Inline CSS,
 * real mm sizing, no external resources — matches InvoiceSheet visually and
 * feeds Electron's printToPDF / print.
 */
export function renderInvoiceHtml(data: SheetData): string {
  const rows = data.items.map((it) => ({ ...it, total: it.qty * it.unit_price }))
  const subtotal = rows.reduce((s, r) => s + r.total, 0)
  const total = subtotal + data.adjustments

  const biz = data.business
  const clientAddr = (data.clientAddress ?? '')
    .split('\n')
    .filter(Boolean)
    .map((l) => `<div>${esc(l)}</div>`)
    .join('')

  const itemRows = rows
    .map(
      (r) => `
        <tr>
          <td class="desc">${esc(r.description) || '&nbsp;'}</td>
          <td class="num">${r.qty || 0}</td>
          <td class="num">${esc(formatPeso(r.unit_price))}</td>
          <td class="num">${esc(formatPeso(r.total))}</td>
        </tr>`
    )
    .join('')

  const logoHtml = biz?.logo_url
    ? `<img class="logo-img" src="${esc(biz.logo_url)}" alt="Logo" />`
    : `<div class="logo">ATC</div>`

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    color: #0f172a;
    font-size: 11pt;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { width: 210mm; min-height: 297mm; padding: 14mm; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; }
  .logo {
    width: 18mm; height: 18mm; border-radius: 4px; background: #1e293b; color: #fff;
    display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12pt;
  }
  .logo-img { height: 24mm; width: auto; max-width: 90mm; object-fit: contain; display: block; }
  .biz { text-align: right; line-height: 1.35; }
  .biz .name { font-weight: 700; font-size: 12.5pt; }
  .title { margin-top: 10mm; }
  .title h1 { margin: 0; font-size: 30pt; font-weight: 800; letter-spacing: -0.5px; }
  .title .date { color: #475569; margin-top: 2px; }
  .grid {
    margin-top: 6mm; padding: 4mm 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6mm;
  }
  .label { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; }
  .val { margin-top: 2px; }
  .strong { font-weight: 700; }
  .col3 { text-align: right; }
  .block + .block { margin-top: 4mm; }
  .mono { font-family: "Courier New", monospace; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 6mm; }
  table.items th {
    text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px;
    color: #64748b; border-bottom: 2px solid #1e293b; padding: 2mm 1mm;
  }
  table.items td { padding: 2mm 1mm; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  table.items th.num, table.items td.num { text-align: right; white-space: nowrap; }
  table.items th.qty { width: 14mm; }
  table.items th.price { width: 28mm; }
  .bottom { margin-top: 6mm; display: flex; justify-content: space-between; gap: 10mm; }
  .notes { max-width: 90mm; }
  .notes .heading { font-weight: 700; }
  .notes .body { margin-top: 2px; color: #475569; white-space: pre-wrap; }
  .totals { width: 70mm; }
  .totals .row { display: flex; justify-content: space-between; padding: 1.5mm 0; }
  .totals .muted { color: #64748b; }
  .totals .grand {
    display: flex; justify-content: space-between; border-top: 2px solid #1e293b;
    padding: 2.5mm 0; margin-top: 1mm; font-size: 14pt; font-weight: 800;
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      ${logoHtml}
      <div class="biz">
        <div class="name">${esc(biz?.name ?? 'Build With ATC')}</div>
        <div>${esc(biz?.address_line1 ?? '26 A. Mabini St., Victoria Shoppesville')}</div>
        <div>${esc(biz?.address_line2 ?? 'Baguio City, 2600')}</div>
        ${biz?.phone ? `<div>${esc(biz.phone)}</div>` : ''}
        ${biz?.email ? `<div>${esc(biz.email)}</div>` : ''}
      </div>
    </div>

    <div class="title">
      <h1>Invoice</h1>
      <div class="date">${esc(formatTemplateDate(data.invoiceDate))}</div>
    </div>

    <div class="grid">
      <div>
        <div class="label">Invoice for</div>
        <div class="val strong">${esc(data.clientName) || '&mdash;'}</div>
        ${clientAddr}
      </div>
      <div>
        <div class="block">
          <div class="label">Payable to</div>
          <div class="val">${esc(data.payableTo) || '&mdash;'}</div>
        </div>
        <div class="block">
          <div class="label">Project</div>
          <div class="val">${esc(data.project) || '&mdash;'}</div>
        </div>
      </div>
      <div class="col3">
        <div class="block">
          <div class="label">Invoice #</div>
          <div class="val mono">${esc(data.invoiceNo) || '&mdash;'}</div>
        </div>
        <div class="block">
          <div class="label">Due date</div>
          <div class="val">${esc(formatTemplateDate(data.dueDate)) || '&mdash;'}</div>
        </div>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th>Description</th>
          <th class="num qty">Qty</th>
          <th class="num price">Unit price</th>
          <th class="num price">Total price</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="bottom">
      <div class="notes">
        <div class="heading">Notes:</div>
        <div class="body">${esc(data.notes)}</div>
      </div>
      <div class="totals">
        <div class="row"><span class="muted">Subtotal</span><span>${esc(formatPeso(subtotal))}</span></div>
        <div class="row"><span class="muted">Adjustments</span><span>${esc(formatPeso(data.adjustments))}</span></div>
        <div class="grand"><span>Total</span><span>${esc(formatPeso(total))}</span></div>
      </div>
    </div>
  </div>
</body>
</html>`
}
