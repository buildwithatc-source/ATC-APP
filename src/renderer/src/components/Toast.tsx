import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'
type ToastItem = { id: number; message: string; type: ToastType }

type ToastApi = { toast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastApi | undefined>(undefined)

const tone: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-slate-800 text-white'
}

const glyph: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' }

/** App-wide toast notifications. Wrap the app once; call useToast() anywhere. */
export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{ animation: 'toastIn .18s ease-out' }}
            className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${tone[t.type]}`}
          >
            <span aria-hidden className="text-base leading-none">
              {glyph[t.type]}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
