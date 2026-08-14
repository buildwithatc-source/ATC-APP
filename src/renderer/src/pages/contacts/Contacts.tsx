import { useState } from 'react'
import { StatusTabs } from '@renderer/components/StatusTabs'
import { ContactList } from './ContactList'
import { createClient, deleteClient, listClients, updateClient } from '@renderer/lib/db/clients'
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier
} from '@renderer/lib/db/suppliers'

type Kind = 'clients' | 'suppliers'

const TABS: { value: Kind; label: string }[] = [
  { value: 'clients', label: 'Clients' },
  { value: 'suppliers', label: 'Suppliers' }
]

/** Contacts = clients + suppliers, same table UI switched by a tab. */
export function Contacts(): JSX.Element {
  const [tab, setTab] = useState<Kind>('clients')

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Contacts</h1>
      </div>

      <div className="mb-4">
        <StatusTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === 'clients' ? (
        <ContactList
          noun="client"
          nounPlural="clients"
          list={listClients}
          create={createClient}
          update={updateClient}
          remove={deleteClient}
        />
      ) : (
        <ContactList
          noun="supplier"
          nounPlural="suppliers"
          list={listSuppliers}
          create={createSupplier}
          update={updateSupplier}
          remove={deleteSupplier}
        />
      )}
    </div>
  )
}
