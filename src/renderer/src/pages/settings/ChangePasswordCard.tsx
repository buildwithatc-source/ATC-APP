import { useState } from 'react'
import { Button, TextField } from '@renderer/components/ui'
import { useAuth } from '@renderer/auth/AuthContext'
import { useToast } from '@renderer/components/Toast'

/** Settings card to change the signed-in account's password. */
export function ChangePasswordCard(): JSX.Element {
  const { changePassword } = useAuth()
  const { toast } = useToast()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (pw.length < 8) {
      setError('Use at least 8 characters.')
      return
    }
    if (pw !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    const { error: err } = await changePassword(pw)
    setBusy(false)
    if (err) {
      setError(err)
      toast('Could not change password', 'error')
      return
    }
    setPw('')
    setConfirm('')
    toast('Password changed')
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="mt-5 space-y-4 rounded-xl bg-white p-5 ring-1 ring-slate-200"
    >
      <div>
        <h2 className="font-semibold">Change password</h2>
        <p className="text-sm text-slate-500">Updates the password for this account.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" loading={busy}>
        Update password
      </Button>
    </form>
  )
}
