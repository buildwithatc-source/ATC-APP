import { app, BrowserWindow, dialog, ipcMain as ipcMainDefault, shell, type IpcMain } from 'electron'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

/**
 * PDF export + print for invoices.
 *
 * The renderer builds a fully self-contained A4 HTML document (inline CSS) and
 * hands it here. We load it into a hidden BrowserWindow and use Chromium's
 * print pipeline: `printToPDF` for export, `print` for the system dialog.
 * This yields true A4 output without depending on the app's Tailwind bundle.
 */

/** Load HTML into a throwaway hidden window; returns it once fully loaded. */
async function renderInHiddenWindow(html: string): Promise<{ win: BrowserWindow; cleanup: () => Promise<void> }> {
  const tmpFile = join(app.getPath('temp'), `atc-invoice-${randomUUID()}.html`)
  await writeFile(tmpFile, html, 'utf8')

  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: false, javascript: false }
  })

  await win.loadFile(tmpFile)
  // Give the layout/fonts a beat to settle before capturing.
  await new Promise((r) => setTimeout(r, 150))

  const cleanup = async (): Promise<void> => {
    if (!win.isDestroyed()) win.destroy()
    try {
      await unlink(tmpFile)
    } catch {
      /* best-effort */
    }
  }

  return { win, cleanup }
}

type ExportResult = { ok: boolean; canceled?: boolean; filePath?: string; error?: string }

async function exportInvoicePdf(html: string, suggestedName: string): Promise<ExportResult> {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export invoice as PDF',
    defaultPath: suggestedName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (canceled || !filePath) return { ok: false, canceled: true }

  const { win, cleanup } = await renderInHiddenWindow(html)
  try {
    const data = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    })
    await writeFile(filePath, data)
    await cleanup()
    void shell.openPath(filePath)
    return { ok: true, filePath }
  } catch (e) {
    await cleanup()
    return { ok: false, error: e instanceof Error ? e.message : 'PDF export failed' }
  }
}

type PrintResult = { ok: boolean; error?: string }

async function printInvoice(html: string): Promise<PrintResult> {
  const { win, cleanup } = await renderInHiddenWindow(html)
  return new Promise<PrintResult>((resolve) => {
    win.webContents.print(
      { silent: false, printBackground: true },
      (success, failureReason) => {
        void cleanup()
        // success is false when the user cancels the dialog — not an error.
        resolve(success || failureReason === 'cancelled' ? { ok: true } : { ok: false, error: failureReason })
      }
    )
  })
}

export function registerPdfIpc(ipcMain: IpcMain = ipcMainDefault): void {
  ipcMain.handle('pdf:export', (_e, html: string, suggestedName: string) =>
    exportInvoicePdf(html, suggestedName)
  )
  ipcMain.handle('pdf:print', (_e, html: string) => printInvoice(html))
}
