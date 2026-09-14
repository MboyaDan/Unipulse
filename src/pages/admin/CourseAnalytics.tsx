import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase'
import { AdminHeader } from '@/components/AdminHeader'
import { SERVICE_SUGGESTIONS } from '@/lib/serviceSuggestions'
import type { CourseCategory } from '@/types'

interface StudentRow {
  course_category: CourseCategory
  university_id: string
  date_registered: string
  universities: { name: string; country_id: string } | null
}

const RANGE_OPTIONS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All time', days: null },
]

export default function CourseAnalytics() {
  const [rows, setRows] = useState<StudentRow[]>([])
  const [universities, setUniversities] = useState<{ id: string; name: string }[]>([])
  const [uniFilter, setUniFilter] = useState('all')
  const [range, setRange] = useState(RANGE_OPTIONS[3])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('universities')
      .select('id, name')
      .order('name')
      .then(({ data }) => data && setUniversities(data))
  }, [])

  useEffect(() => {
    setLoading(true)
    let query = supabase.from('students').select('course_category, university_id, date_registered, universities(name, country_id)')
    if (range.days) {
      query = query.gte('date_registered', new Date(Date.now() - range.days * 86400000).toISOString())
    }
    if (uniFilter !== 'all') query = query.eq('university_id', uniFilter)

    query.then(({ data }) => {
      setRows((data ?? []) as unknown as StudentRow[])
      setLoading(false)
    })
  }, [uniFilter, range])

  const distribution = useMemo(() => {
    const map = new Map<string, number>()
    rows.forEach((r) => map.set(r.course_category, (map.get(r.course_category) ?? 0) + 1))
    return Array.from(map.entries())
      .map(([course, count]) => ({ course, count }))
      .sort((a, b) => b.count - a.count)
  }, [rows])

  return (
    <div>
      <AdminHeader title="Course analytics" subtitle="What people are studying, and what to pitch each community." />

      <div className="px-6 lg:px-10 py-4 flex flex-wrap gap-3 border-b border-hairline">
        <select value={uniFilter} onChange={(e) => setUniFilter(e.target.value)} className="field w-auto py-2 text-[13px]">
          <option value="all">All universities</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <div className="flex border border-hairline">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r)}
              className={`px-3 py-2 text-[13px] ${range.label === r.label ? 'bg-lime text-base' : 'text-muted hover:text-ink'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 lg:px-10 py-6">
        {loading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : distribution.length === 0 ? (
          <p className="text-muted text-sm">No registrations in this range.</p>
        ) : (
          <>
            <div className="h-[320px] w-full">
              <ResponsiveContainer>
                <BarChart data={distribution} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid stroke="#2A2A24" horizontal={false} />
                  <XAxis type="number" stroke="#8C8C86" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="course" stroke="#8C8C86" fontSize={12} width={140} />
                  <Tooltip
                    contentStyle={{ background: '#131311', border: '1px solid #2A2A24', fontSize: 13 }}
                    labelStyle={{ color: '#F4F4EF' }}
                    cursor={{ fill: '#1B1B18' }}
                  />
                  <Bar dataKey="count" fill="#C6FF3D" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <h2 className="font-display font-semibold text-[16px] mt-10 mb-4">What to pitch this community</h2>
            <div className="border-t border-hairline divide-y divide-hairline">
              {distribution.map((d) => (
                <div key={d.course} className="flex items-center justify-between py-3 text-[14px]">
                  <span>
                    {d.course} <span className="text-muted num">· {d.count}</span>
                  </span>
                  <span className="text-lime text-[13px]">{SERVICE_SUGGESTIONS[d.course as CourseCategory]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
