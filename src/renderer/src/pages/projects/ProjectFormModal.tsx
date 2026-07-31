import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@renderer/components/Modal'
import { Button, TextField } from '@renderer/components/ui'
import type { Client, Project, ProjectInput } from '@renderer/lib/types'

const schema = z.object({
  name: z.string(),
  client_id: z.string().min(1, 'Select a client'),
  status: z.enum(['active', 'complete', 'archived'])
})
type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  project: Project | null
  clients: Client[]
  onClose: () => void
  onSubmit: (input: ProjectInput) => Promise<void>
}

const control =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30'

export function ProjectFormModal({
  open,
  project,
  clients,
  onClose,
  onSubmit
}: Props): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', client_id: '', status: 'active' }
  })

  useEffect(() => {
    if (open) {
      reset({
        name: project?.name ?? '',
        client_id: project?.client_id ?? '',
        status: project?.status ?? 'active'
      })
    }
  }, [open, project, reset])

  const submit = handleSubmit(async (v) =>
    onSubmit({ name: v.name, client_id: v.client_id, status: v.status })
  )

  return (
    <Modal
      open={open}
      title={project ? `Edit ${project.code}` : 'New project'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={isSubmitting} onClick={() => void submit()}>
            {project ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="space-y-4"
      >
        {!project && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200">
            A project code (e.g. <span className="font-mono">ATC{new Date().getFullYear()}001</span>)
            is assigned automatically.
          </p>
        )}

        <TextField
          label="Description"
          autoFocus
          placeholder="e.g. Kitchen fit-out"
          {...register('name')}
        />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Client</span>
          <select className={control} {...register('client_id')}>
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.client_id && (
            <span className="mt-1 block text-xs text-red-600">{errors.client_id.message}</span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
          <select className={control} {...register('status')}>
            <option value="active">Active</option>
            <option value="complete">Complete</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
