import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@renderer/components/Modal'
import { Button, TextArea, TextField } from '@renderer/components/ui'
import type { Contact, ContactInput } from '@renderer/lib/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string(),
  contact_number: z.string()
})
type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  /** Singular noun for labels, e.g. 'client' or 'supplier'. */
  noun: string
  /** Present when editing; absent when creating. */
  contact: Contact | null
  onClose: () => void
  onSubmit: (input: ContactInput) => Promise<void>
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/** Add/edit form for a contact (client or supplier) — identical fields. */
export function ContactFormModal({ open, noun, contact, onClose, onSubmit }: Props): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', address: '', contact_number: '' }
  })

  useEffect(() => {
    if (open) {
      reset({
        name: contact?.name ?? '',
        address: contact?.address ?? '',
        contact_number: contact?.contact_number ?? ''
      })
    }
  }, [open, contact, reset])

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      name: values.name,
      address: values.address,
      contact_number: values.contact_number
    })
  })

  return (
    <Modal
      open={open}
      title={contact ? `Edit ${noun}` : `Add ${noun}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={isSubmitting} type="button">
            {contact ? 'Save changes' : `Add ${noun}`}
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
        aria-label={`${cap(noun)} form`}
      >
        <TextField label="Name" autoFocus error={errors.name?.message} {...register('name')} />
        <TextArea label="Address" rows={2} {...register('address')} />
        <TextField label="Contact number" {...register('contact_number')} />
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
