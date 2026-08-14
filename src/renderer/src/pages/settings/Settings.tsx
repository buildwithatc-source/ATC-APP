import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, TextField } from '@renderer/components/ui'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import { getBusiness, updateBusiness } from '@renderer/lib/db/business'
import type { Business } from '@renderer/lib/types'
import { useToast } from '@renderer/components/Toast'
import { UpdatePanel } from './UpdatePanel'
import { ChangePasswordCard } from './ChangePasswordCard'

const schema = z.object({
  name: z.string().min(1, 'Business name is required'),
  address_line1: z.string(),
  address_line2: z.string(),
  phone: z.string(),
  email: z.string(),
  payable_to_default: z.string()
})
type FormValues = z.infer<typeof schema>

const MAX_LOGO_BYTES = 500 * 1024 // 500 KB — stored inline as a data URL

export function Settings(): JSX.Element {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    ;(async () => {
      try {
        const biz = await getBusiness()
        setBusiness(biz)
        setLogoUrl(biz?.logo_url ?? null)
        if (biz) {
          reset({
            name: biz.name ?? '',
            address_line1: biz.address_line1 ?? '',
            address_line2: biz.address_line2 ?? '',
            phone: biz.phone ?? '',
            email: biz.email ?? '',
            payable_to_default: biz.payable_to_default ?? ''
          })
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    })()
  }, [reset])

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_LOGO_BYTES) {
      setError('Logo must be under 500 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setLogoUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!business) return
    setError(null)
    setSaved(false)
    try {
      const updated = await updateBusiness(business.id, {
        name: values.name,
        address_line1: values.address_line1 || null,
        address_line2: values.address_line2 || null,
        phone: values.phone || null,
        email: values.email || null,
        logo_url: logoUrl,
        payable_to_default: values.payable_to_default || null
      })
      setBusiness(updated)
      setSaved(true)
      toast('Settings saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      toast('Could not save settings', 'error')
    }
  })

  if (loading) return <FullscreenSpinner label="Loading settings…" />

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-5 text-2xl font-semibold">Settings</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="font-semibold">Business details</h2>
        <p className="-mt-3 text-sm text-slate-500">These appear on the invoice header.</p>

        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-slate-800 text-sm font-bold text-white">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              'ATC'
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickLogo}
            />
            <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
              {logoUrl ? 'Change logo' : 'Upload logo'}
            </Button>
            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl(null)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <TextField label="Business name" error={errors.name?.message} {...register('name')} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Address line 1" {...register('address_line1')} />
          <TextField label="Address line 2" {...register('address_line2')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Phone" {...register('phone')} />
          <TextField label="Email" {...register('email')} />
        </div>
        <TextField
          label="Default 'Payable to'"
          {...register('payable_to_default')}
        />

        <div className="flex items-center gap-3">
          <Button type="submit" loading={isSubmitting}>
            Save changes
          </Button>
          {saved && <span className="text-sm text-emerald-600">Saved ✓</span>}
        </div>
      </form>

      <ChangePasswordCard />

      <div className="mt-5">
        <UpdatePanel />
      </div>
    </div>
  )
}
