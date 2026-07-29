export function FullscreenSpinner({ label }: { label?: string }): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-accent" />
        {label && <span className="text-sm">{label}</span>}
      </div>
    </div>
  )
}
