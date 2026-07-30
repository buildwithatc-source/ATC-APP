import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, TextField } from '@renderer/components/ui'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import { listClients } from '@renderer/lib/db/clients'
import { createProject, listProjects } from '@renderer/lib/db/projects'
import type { Client, ProjectInput, ProjectWithClient } from '@renderer/lib/types'
import { ProjectFormModal } from './ProjectFormModal'

export function Projects(): JSX.Element {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectWithClient[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [pr, cl] = await Promise.all([listProjects(), listClients()])
        setProjects(pr)
        setClients(cl)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load projects')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) =>
      `${p.code} ${p.name ?? ''} ${p.clients?.name ?? ''}`.toLowerCase().includes(q)
    )
  }, [projects, search])

  async function handleCreate(input: ProjectInput): Promise<void> {
    const created = await createProject(input)
    // Reload to pick up the client join for display.
    setProjects(await listProjects())
    setFormOpen(false)
    navigate(`/projects/${created.id}`)
  }

  if (loading) return <FullscreenSpinner label="Loading projects…" />

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-slate-500">{projects.length} total</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>+ New project</Button>
      </div>

      <div className="mb-4">
        <TextField
          label=""
          placeholder="Search by project or client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
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
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        p.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    {search ? 'No projects match your search.' : 'No projects yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ProjectFormModal
        open={formOpen}
        project={null}
        clients={clients}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}
