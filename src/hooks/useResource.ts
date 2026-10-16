import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../lib/format'

interface State<T> {
  data?: T
  error?: string
  loading: boolean
}

/**
 * Loads data once and again on `reload()`. `loader` must be referentially stable (pass a
 * module-level function, not an inline arrow). Previous data stays on screen while a
 * reload is in flight.
 */
export function useResource<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ loading: true })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    loader()
      .then((data) => { if (!cancelled) setState({ data, loading: false }) })
      .catch((err) => { if (!cancelled) setState((s) => ({ data: s.data, error: errorMessage(err), loading: false })) })
    return () => { cancelled = true }
  }, [loader, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, reload }
}
