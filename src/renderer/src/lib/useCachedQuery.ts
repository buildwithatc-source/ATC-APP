import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A tiny stale-while-revalidate cache for Supabase reads.
 *
 * Pages that navigate back and forth were each doing a fresh network fetch on
 * mount and blocking behind a spinner. This caches the last result per key: a
 * revisit paints instantly from cache and revalidates in the background, so
 * navigation feels immediate. `setData` writes through to the cache so
 * optimistic mutations stay consistent across pages (e.g. the shared 'clients'
 * key). Cache lives for the app session; call clearQueryCache() on sign-out.
 */

type Entry = { data: unknown; ts: number }

const cache = new Map<string, Entry>()

export function clearQueryCache(): void {
  cache.clear()
}

type Result<T> = {
  data: T | undefined
  setData: (next: T | ((prev: T | undefined) => T)) => void
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { staleTime?: number }
): Result<T> {
  const staleTime = opts?.staleTime ?? 15000
  const cached = cache.get(key)

  const [data, setDataState] = useState<T | undefined>(cached?.data as T | undefined)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  // Keep the latest fetcher without making it an effect dependency (callers pass
  // a fresh inline closure each render).
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const setData = useCallback(
    (next: T | ((prev: T | undefined) => T)) => {
      setDataState((prev) => {
        const val =
          typeof next === 'function' ? (next as (p: T | undefined) => T)(prev) : next
        cache.set(key, { data: val, ts: Date.now() })
        return val
      })
    },
    [key]
  )

  const reload = useCallback(async (): Promise<void> => {
    try {
      const res = await fetcherRef.current()
      cache.set(key, { data: res, ts: Date.now() })
      setDataState(res)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const c = cache.get(key)
    if (!c) {
      setLoading(true)
      void reload()
      return
    }
    // Paint cached data immediately; revalidate only if it's gone stale.
    setDataState(c.data as T)
    setLoading(false)
    if (Date.now() - c.ts > staleTime) void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { data, setData, loading, error, reload }
}
