import { useState } from 'react'
import { Button, TextField } from '@renderer/components/ui'
import { Modal } from '@renderer/components/Modal'

type Props = {
  imageUrl: string | null
  /** Persist the new value (a link, or null to remove). Should throw on failure. */
  onChange: (imageUrl: string | null) => Promise<void>
}

/** Normalize a pasted link: trim, and assume https:// if no scheme was given. */
function normalizeUrl(raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

/**
 * A small photo icon beside an expense. Empty = no image attached; filled/green
 * = a link is attached. Clicking opens a modal to paste a Google Drive link
 * (or open / replace / remove an existing one). No upload — just the link.
 */
export function ExpenseImageButton({ imageUrl, onChange }: Props): JSX.Element {
  const attached = !!imageUrl
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openModal(): void {
    setDraft(imageUrl ?? '')
    setError(null)
    setOpen(true)
  }

  async function save(): Promise<void> {
    const url = normalizeUrl(draft)
    if (!url) {
      setError('Paste a link first, or use Remove.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onChange(url)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the link.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await onChange(null)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove the link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title={attached ? 'Image attached — click to view' : 'Attach an image link'}
        aria-label={attached ? 'Image attached' : 'Attach image'}
        className={`rounded-md p-1.5 transition-colors ${
          attached
            ? 'text-emerald-600 hover:bg-emerald-50'
            : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'
        }`}
      >
        <PhotoIcon filled={attached} />
      </button>

      <Modal
        open={open}
        title="Expense image"
        onClose={() => setOpen(false)}
        footer={
          <>
            {attached && (
              <Button
                variant="ghost"
                type="button"
                className="mr-auto text-red-600 hover:bg-red-50"
                disabled={busy}
                onClick={() => void remove()}
              >
                Remove
              </Button>
            )}
            <Button variant="ghost" type="button" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {attached && (
            <button
              type="button"
              onClick={() => window.open(imageUrl as string, '_blank')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
            >
              <PhotoIcon filled />
              Open current image
            </button>
          )}
          <TextField
            label="Google Drive link"
            placeholder="Paste the image's Drive share link…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-slate-400">
            Upload the photo to Google Drive, copy its share link, and paste it here.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Modal>
    </>
  )
}

function PhotoIcon({ filled }: { filled?: boolean }): JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill={filled ? '#fff' : 'currentColor'} stroke="none" />
      <path d="M21 15l-5-5L5 21" stroke={filled ? '#fff' : 'currentColor'} />
    </svg>
  )
}
