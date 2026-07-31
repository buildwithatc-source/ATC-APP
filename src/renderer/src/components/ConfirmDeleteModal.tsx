import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './ui'

type Props = {
  open: boolean
  title: string
  /** Warning body shown above the confirmation input. */
  description: React.ReactNode
  /** The exact text the user must type to enable deletion. */
  confirmText: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

/** Two-step delete: the user must type an exact phrase before Delete enables. */
export function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmText,
  busy,
  onClose,
  onConfirm
}: Props): JSX.Element {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (open) setTyped('')
  }, [open])

  const matches = typed.trim() === confirmText

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={busy}
            disabled={!matches}
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-600">
        <div>{description}</div>
        <div>
          Type{' '}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-800">
            {confirmText}
          </span>{' '}
          to confirm:
        </div>
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={confirmText}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
        />
      </div>
    </Modal>
  )
}
