import { useState } from 'react'
import { Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminHeader } from '@/components/AdminHeader'
import { downloadCsv } from '@/lib/csv'

const FILTERS = [
  { key: 'all', label: 'All students' },
  { key: 'verified', label: 'Verified only' },
  { key: 'threshold_reached', label: 'Universities at threshold' },
  { key: 'ambassadors', label: 'Ambassadors only' },
]

export default function Export() {
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [lastCount, setLastCount] = useState<number | null>(null)

  async function runExport() {
    setBusy(true)
    setLastCount(null)
    try {
      let query = supabase
        .from('students')
        .select(
          'full_name, phone_whatsapp, course_category, course_exact_text, acquisition_channel, verification_status, contact_status, is_ambassador, date_registered, universities(name, community_status), countries(name)'
        )
        .order('date_registered', { ascending: false })

      if (filter === 'verified') query = query.eq('verification_status', 'Verified')
      if (filter === 'ambassadors') query = query.eq('is_ambassador', true)

      const { data, error } = await query
      if (error) throw error

      let rows = data ?? []
      if (filter === 'threshold_reached') {
        rows = rows.filter(
          (r) => (r.universities as unknown as { community_status: string } | null)?.community_status === 'Threshold Reached'
        )
      }

      const flat = rows.map((r) => ({
        full_name: r.full_name,
        phone_whatsapp: r.phone_whatsapp,
        country: (r.countries as unknown as { name: string } | null)?.name ?? '',
        university: (r.universities as unknown as { name: string } | null)?.name ?? '',
        community_status: (r.universities as unknown as { community_status: string } | null)?.community_status ?? '',
        course_category: r.course_category,
        course_exact_text: r.course_exact_text,
        acquisition_channel: r.acquisition_channel,
        verification_status: r.verification_status,
        contact_status: r.contact_status,
        is_ambassador: r.is_ambassador,
        date_registered: r.date_registered,
      }))

      downloadCsv(`unipulse-students-${filter}-${new Date().toISOString().slice(0, 10)}.csv`, flat)
      setLastCount(flat.length)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <AdminHeader title="Export" subtitle="Download a filtered CSV of student registrations." />

      <div className="px-6 lg:px-10 py-6 max-w-[440px]">
        <label className="field-label">What to export</label>
        <div className="space-y-2">
          {FILTERS.map((f) => (
            <label key={f.key} className="flex items-center gap-3 border border-hairline px-4 py-3 cursor-pointer">
              <input type="radio" name="filter" checked={filter === f.key} onChange={() => setFilter(f.key)} className="accent-lime" />
              <span className="text-[14px]">{f.label}</span>
            </label>
          ))}
        </div>

        <button onClick={runExport} disabled={busy} className="btn-primary mt-6 w-full">
          <Download size={16} /> {busy ? 'Preparing…' : 'Download CSV'}
        </button>

        {lastCount !== null && <p className="text-muted text-[13px] mt-3">Exported {lastCount} rows.</p>}
      </div>
    </div>
  )
}
