import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@renderer/auth/AuthContext'
import { Button, TextField } from '@renderer/components/ui'
import logo from '@renderer/assets/logo.png'

const schema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required')
})

type LoginForm = z.infer<typeof schema>

export function Login(): JSX.Element {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginForm>({ resolver: zodResolver(schema) })

  async function onSubmit(values: LoginForm): Promise<void> {
    setFormError(null)
    const { error } = await signIn(values.username, values.password)
    if (error) {
      setFormError(
        error.toLowerCase().includes('invalid') ? 'Invalid username or password.' : error
      )
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex h-full items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src={logo} alt="ATC Construction" className="h-16 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-semibold">ATC Ledger</h1>
            <p className="text-sm text-slate-500">Sign in to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextField
            label="Username or email"
            autoFocus
            autoComplete="username"
            spellCheck={false}
            error={errors.username?.message}
            {...register('username')}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {formError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {formError}
            </div>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Accounts are provisioned by your administrator.
        </p>
      </div>
    </div>
  )
}
