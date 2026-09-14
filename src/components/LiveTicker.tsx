import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatNumber } from '@/lib/format'
import type { LivePulse } from '@/types'

/**
 * The single most important design decision on the homepage per the brief:
 * a live-feeling counter, not an illustration. Polls every 25s. Not a true
 * realtime subscription — a periodic refetch reads identically to the user
 * and is far simpler to operate.
 */
export function LiveTicker() {
  const [pulse, setPulse] = useState<LivePulse | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchPulse = async () => {
      const { data } = await supabase.rpc('get_live_pulse')
      if (!cancelled && data && data[0]) setPulse(data[0] as LivePulse)
    }
    fetchPulse()
    const id = setInterval(fetchPulse, 25000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (!pulse) {
    return (
      <div className="flex items-center gap-2.5 text-sm text-muted">
        <span className="w-2 h-2 rounded-full bg-hairline animate-pulse2" />
        <span>Loading live activity…</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="w-2 h-2 rounded-full bg-lime animate-pulse2" />
      <span className="text-ink">
        Live —{' '}
        <span className="num font-medium">{formatNumber(pulse.registrations_last_hour)}</span>{' '}
        student{pulse.registrations_last_hour === 1 ? '' : 's'} joined a university this hour
      </span>
    </div>
  )
}
