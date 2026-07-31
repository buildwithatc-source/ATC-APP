import { Button } from './ui'

type Props = {
  open: boolean
  /** Full self-contained HTML document (same one that prints). */
  html: string
  printing: boolean
  exporting: boolean
  onClose: () => void
  onPrint: () => void
  onExport: () => void
}

/**
 * In-app print preview. Renders the exact print HTML in an A4-sized iframe so
 * the user sees what will print (Electron's own print dialog has no preview),
 * with Print / Export actions.
 */
export function PrintPreview({
  open,
  html,
  printing,
  exporting,
  onClose,
  onPrint,
  onExport
}: Props): JSX.Element | null {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-full w-full max-w-[900px] flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
          <h2 className="text-lg font-semibold">Print preview</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="border border-slate-300" loading={exporting} onClick={onExport}>
              Export PDF
            </Button>
            <Button loading={printing} onClick={onPrint}>
              Print
            </Button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="ml-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-200/60 p-4">
          {/* A4 at 96dpi is 794×1123px; show it centered and scrollable. */}
          <iframe
            title="Print preview"
            srcDoc={html}
            className="mx-auto block border border-slate-300 bg-white shadow"
            style={{ width: 794, height: 1123 }}
          />
        </div>
      </div>
    </div>
  )
}
