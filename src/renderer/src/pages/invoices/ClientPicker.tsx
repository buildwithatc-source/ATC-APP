import { useState } from 'react'
import type { Client, ClientInput } from '@renderer/lib/types'
import { createClient } from '@renderer/lib/db/clients'
import { ClientFormModal } from '@renderer/pages/clients/ClientFormModal'

type Props = {
  clients: Client[]
  value: string | null
  onChange: (clientId: string) => void
  /** Called after a new client is created so the parent can refresh its list. */
  onClientCreated: (client: Client) => void
  error?: string
}

/** Dropdown of clients with an inline "+ New" that opens the client form. */
export function ClientPicker({
  clients,
  value,
  onChange,
  onClientCreated,
  error
}: Props): JSX.Element {
  const [addOpen, setAddOpen] = useState(false)

  async function handleCreate(input: ClientInput): Promise<void> {
    const created = await createClient(input)
    onClientCreated(created)
    onChange(created.id)
    setAddOpen(false)
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">Client</span>
      <div className="flex gap-2">
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30"
        >
          <option value="" disabled>
            Select a client…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          + New
        </button>
      </div>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}

      <ClientFormModal
        open={addOpen}
        client={null}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}
