import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCachedQuery } from '@renderer/lib/useCachedQuery'
import { Button, TextField } from '@renderer/components/ui'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import { ConfirmDeleteModal } from '@renderer/components/ConfirmDeleteModal'
import { StatusTabs } from '@renderer/components/StatusTabs'
import { listClients } from '@renderer/lib/db/clients'
import {
  createProject,
  deleteProject,
  listProjects,
  setProjectStatus
} from '@renderer/lib/db/projects'
import { getExpenseTotalsByProject } from '@renderer/lib/db/expenses'
import { formatPeso } from '@renderer/lib/format'
import type { ProjectInput, ProjectStatus, ProjectWithClient } from '@renderer/lib/types'
import { ProjectFormModal } from './ProjectFormModal'
import { ProjectStatusSelect } from './ProjectStatusSelect'

const TABS: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'complete', label: 'Complete' }
]

export function Projects(): JSX.Element {
  const navigate = useNavigate()
  const projectsQ = useCachedQuery('projects', listProjects)
  const clientsQ = useCachedQuery('clients', listClients)
  const totalsQ = useCachedQuery('expenseTotals', getExpenseTotalsByProject)
  const projects = projectsQ.data ?? []
  const clients = clientsQ.data ?? []
  const expenseTotals = totalsQ.data ?? {}
  const loading = projectsQ.loading
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<ProjectStatus>('active')
  const [formOpen, setFormOpen] = useState(false)
  const [statusBusy, setStatusBusy] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ProjectWithClient | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const error = projectsQ.error ?? actionError

  const counts = useMemo(() => {
    const c: Record<ProjectStatus, number> = { active: 0, complete: 0, archived: 0 }
    for (const p of projects) c[p.status]++
    return c
  }, [projects])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projects
      .filter((p) => p.status === tab)
      .filter(
        (p) =>
          !q || `${p.code} ${p.name ?? ''} ${p.clients?.name ?? ''}`.toLowerCase().includes(q)
      )
  }, [projects, search, tab])

  async function handleCreate(input: ProjectInput): Promise<void> {
    const created = await createProject(input)
    await projectsQ.reload()
    setFormOpen(false)
    navigate(`/projects/${created.id}`)
  }

  async function changeStatus(p: ProjectWithClient, status: ProjectStatus): Promise<void> {
    const prev = p.status
    setStatusBusy(p.id)
    projectsQ.setData((ps) => (ps ?? []).map((x) => (x.id === p.id ? { ...x, status } : x)))
    try {
      await setProjectStatus(p.id, status)
    } catch {
      projectsQ.setData((ps) => (ps ?? []).map((x) => (x.id === p.id ? { ...x, status: prev } : x)))
    } finally {
      setStatusBusy(null)
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return
    setDeleteBusy(true)
    setActionError(null)
    try {
      await deleteProject(deleting.id)
      projectsQ.setData((ps) => (ps ?? []).filter((x) => x.id !== deleting.id))
      setDeleting(null)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete project')
    } finally {
      setDeleteBusy(false)
    }
  }

  /** Profit = contract (total quote) − total expense; only for completed projects. */
  function profitOf(p: ProjectWithClient): number {
    return Number(p.contract_budget) - (expenseTotals[p.id] ?? 0)
  }

  if (loading) return <FullscreenSpinner label="Loading projects…" />

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-slate-500">{projects.length} total</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>+ New project</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <StatusTabs tabs={TABS} value={tab} counts={counts} onChange={setTab} />
        <div className="min-w-[16rem] flex-1">
          <TextField
            label=""
            placeholder="Search by project or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Profit</th>
              <th className="w-16 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-mono font-medium text-slate-900">{p.code}</td>
                <td className="px-4 py-3 text-slate-700">{p.name || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{p.clients?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <ProjectStatusSelect
                    value={p.status}
                    busy={statusBusy === p.id}
                    onChange={(s) => void changeStatus(p, s)}
                  />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {p.status === 'complete' ? (
                    <span className={profitOf(p) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {formatPeso(profitOf(p))}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleting(p)
                    }}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  {search ? 'No projects match your search.' : `No ${tab} projects.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProjectFormModal
        open={formOpen}
        project={null}
        clients={clients}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />

      <ConfirmDeleteModal
        open={deleting !== null}
        title="Delete project"
        confirmText={deleting?.code ?? ''}
        busy={deleteBusy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        description={
          <>
            This permanently deletes <span className="font-semibold">{deleting?.code}</span>
            {deleting?.name ? ` (${deleting.name})` : ''} and all its{' '}
            <span className="font-semibold">expenses, budget categories, and contract items</span>.
            This can&apos;t be undone.
          </>
        }
      />
    </div>
  )
}
