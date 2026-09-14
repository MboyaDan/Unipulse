import { supabase } from '@/lib/supabase'
import { usePoll } from '@/hooks/usePoll'
import { AdminHeader } from '@/components/AdminHeader'
import { Stat } from '@/components/Stat'
import { formatNumber } from '@/lib/format'

interface OverviewData {
  totalStudents: number
  totalUniversities: number
  activeCountries: number
  activeCommunities: number
  buildingCommunities: number
  readyCommunities: number
  registeredThisWeek: number
  registeredThisMonth: number
  recentFeed: { id: string; full_name: string; university_name: string; course_category: string; date_registered: string }[]
}

async function fetchOverview(): Promise<OverviewData> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

  const [
    { count: totalStudents },
    { count: totalUniversities },
    { count: activeCountries },
    { count: activeCommunities },
    { count: buildingCommunities },
    { count: readyCommunities },
    { count: registeredThisWeek },
    { count: registeredThisMonth },
    { data: recentFeedRaw },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('universities').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('countries').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('universities').select('*', { count: 'exact', head: true }).in('community_status', ['Active', 'Community Created']),
    supabase.from('universities').select('*', { count: 'exact', head: true }).eq('community_status', 'Building Interest'),
    supabase.from('universities').select('*', { count: 'exact', head: true }).eq('community_status', 'Threshold Reached'),
    supabase.from('students').select('*', { count: 'exact', head: true }).gte('date_registered', weekAgo),
    supabase.from('students').select('*', { count: 'exact', head: true }).gte('date_registered', monthAgo),
    supabase
      .from('students')
      .select('id, full_name, course_category, date_registered, universities(name)')
      .order('date_registered', { ascending: false })
      .limit(10),
  ])

  const recentFeed = (recentFeedRaw ?? []).map((r) => ({
    id: r.id,
    full_name: r.full_name,
    course_category: r.course_category,
    date_registered: r.date_registered,
    university_name: (r.universities as unknown as { name: string } | null)?.name ?? '—',
  }))

  return {
    totalStudents: totalStudents ?? 0,
    totalUniversities: totalUniversities ?? 0,
    activeCountries: activeCountries ?? 0,
    activeCommunities: activeCommunities ?? 0,
    buildingCommunities: buildingCommunities ?? 0,
    readyCommunities: readyCommunities ?? 0,
    registeredThisWeek: registeredThisWeek ?? 0,
    registeredThisMonth: registeredThisMonth ?? 0,
    recentFeed,
  }
}

export default function Overview() {
  const { data } = usePoll(fetchOverview, 20000)

  return (
    <div>
      <AdminHeader title="Overview" subtitle="Refreshes automatically every 20 seconds." />

      <div className="px-6 lg:px-10 py-6 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-8 border-b border-hairline">
        <Stat value={formatNumber(data?.totalStudents ?? 0)} label="Total students" accent />
        <Stat value={formatNumber(data?.totalUniversities ?? 0)} label="Universities" />
        <Stat value={formatNumber(data?.activeCountries ?? 0)} label="Countries active" />
        <Stat value={formatNumber(data?.activeCommunities ?? 0)} label="Active communities" />
        <Stat value={formatNumber(data?.buildingCommunities ?? 0)} label="Communities building" />
        <Stat value={formatNumber(data?.readyCommunities ?? 0)} label="Ready to create" />
        <Stat value={formatNumber(data?.registeredThisWeek ?? 0)} label="Registered this week" />
        <Stat value={formatNumber(data?.registeredThisMonth ?? 0)} label="Registered this month" />
      </div>

      <div className="px-6 lg:px-10 py-6">
        <h2 className="font-display font-semibold text-[16px] mb-4">Latest registrations</h2>
        <div className="border-t border-hairline divide-y divide-hairline">
          {data?.recentFeed.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-3 text-[14px]">
              <div>
                <span className="font-medium">{r.full_name}</span>
                <span className="text-muted"> — {r.university_name} · {r.course_category}</span>
              </div>
              <span className="text-muted text-[13px] num">{new Date(r.date_registered).toLocaleString()}</span>
            </div>
          ))}
          {data?.recentFeed.length === 0 && <p className="py-6 text-muted text-sm">No registrations yet.</p>}
        </div>
      </div>
    </div>
  )
}
