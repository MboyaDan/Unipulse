import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminHeader } from '@/components/AdminHeader'
import { DotCluster } from '@/components/DotCluster'
import { CreateCommunityModal } from '@/components/CreateCommunityModal'
import type { CommunityStatus, UniversityFull } from '@/types'

interface Row extends UniversityFull {
  country_name: string
  country_code: string
  referral_count: number
}

const STATUS_BADGE: Record<CommunityStatus, string> = {
  'Not Started': 'text-faint',
  'Building Interest': 'text-muted',
  'Threshold Reached': 'text-lime',
  'Community Created': 'text-lime',
  Active: 'text-lime',
  Paused: 'text-danger',
  Archived: 'text-faint',
}

const OPPORTUNITY_TAG = (score: number, status: CommunityStatus) => {
  if (status === 'Active' || status === 'Community Created') return { label: '✓ Community Active', tone: 'text-lime' }
  if (score >= 70) return { label: '🔥 High Demand', tone: 'text-lime' }
  if (score >= 40) return { label: '🟡 Growing', tone: 'text-ink' }
  return { label: '⚪ Low Demand', tone: 'text-muted' }
}

export default function Pipeline() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modalUni, setModalUni] = useState<UniversityFull | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('universities_scored')
      .select('*, countries(name, code)')
      .order('opportunity_score', { ascending: false })

    if (data) {
      const universityIds = data.map((u) => u.id)
      const { data: referralCounts } = await supabase.from('referrals').select('university_id').in('university_id', universityIds)
      const countMap = new Map<string, number>()
      referralCounts?.forEach((r) => countMap.set(r.university_id, (countMap.get(r.university_id) ?? 0) + 1))

      setRows(
        data.map((u) => ({
          ...u,
          country_name: (u.countries as unknown as { name: string; code: string })?.name ?? '',
          country_code: (u.countries as unknown as { name: string; code: string })?.code ?? '',
          referral_count: countMap.get(u.id) ?? 0,
        }))
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = rows.filter(
    (r) => (countryFilter === 'all' || r.country_code === countryFilter) && (statusFilter === 'all' || r.community_status === statusFilter)
  )

  const countries = Array.from(new Set(rows.map((r) => r.country_code))).filter(Boolean)

  return (
    <div>
      <AdminHeader title="University pipeline" subtitle="Ranked by opportunity score — where to market next." />

      <div className="px-6 lg:px-10 py-4 flex flex-wrap gap-3 border-b border-hairline">
        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="field w-auto py-2 text-[13px]">
          <option value="all">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field w-auto py-2 text-[13px]">
          <option value="all">All statuses</option>
          {(['Not Started', 'Building Interest', 'Threshold Reached', 'Community Created', 'Active', 'Paused', 'Archived'] as const).map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            )
          )}
        </select>
      </div>

      <div className="px-6 lg:px-10 py-6">
        {loading && <p className="text-muted text-sm">Loading pipeline…</p>}
        <div className="space-y-3">
          {filtered.map((u) => {
            const tag = OPPORTUNITY_TAG(u.opportunity_score ?? 0, u.community_status)
            return (
              <div key={u.id} className="border border-hairline p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-medium text-[16px] truncate">{u.name}</h3>
                      <span className="text-[12px] text-muted">Tier {u.priority_tier}</span>
                      <span className={`text-[12px] ${tag.tone}`}>{tag.label}</span>
                    </div>
                    <p className="text-[13px] text-muted mt-1">
                      {u.country_name} · {u.city || 'city unknown'} ·{' '}
                      <span className={STATUS_BADGE[u.community_status]}>{u.community_status}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <div className="num text-[13px]">
                        {u.current_registrations}/{u.community_threshold}
                      </div>
                      <div className="text-[12px] text-muted">registered</div>
                    </div>
                    <div className="text-right">
                      <div className="num text-[13px]">{u.opportunity_score ?? 0}</div>
                      <div className="text-[12px] text-muted">score</div>
                    </div>
                    <div className="text-right">
                      <div className="num text-[13px]">{u.referral_count}</div>
                      <div className="text-[12px] text-muted">referrals</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <DotCluster filled={u.current_registrations} total={u.community_threshold} size="sm" />
                  {u.community_status === 'Threshold Reached' && (
                    <button onClick={() => setModalUni(u)} className="btn-primary py-2 px-4 text-[13px] shrink-0">
                      Create community
                    </button>
                  )}
                  {(u.community_status === 'Active' || u.community_status === 'Community Created') && (
                    <span className="text-[13px] text-lime shrink-0">Community live</span>
                  )}
                </div>
              </div>
            )
          })}
          {!loading && filtered.length === 0 && <p className="text-muted text-sm">No universities match these filters.</p>}
        </div>
      </div>

      {modalUni && (
        <CreateCommunityModal
          university={modalUni}
          onClose={() => setModalUni(null)}
          onCreated={() => {
            setModalUni(null)
            load()
          }}
        />
      )}
    </div>
  )
}
