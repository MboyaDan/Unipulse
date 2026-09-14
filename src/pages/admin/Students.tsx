import { useEffect, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminHeader } from '@/components/AdminHeader'
import type { ContactStatus, Student, VerificationStatus } from '@/types'

interface Row extends Student {
  university_name: string
}

const VERIFICATION_OPTIONS: VerificationStatus[] = ['New', 'Under Review', 'Verified', 'Rejected']
const CONTACT_OPTIONS: ContactStatus[] = ['New', 'Contacted', 'Added to Community']

export default function Students() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('students')
      .select('*, universities(name)')
      .order('date_registered', { ascending: false })
      .limit(300)

    if (data) {
      setRows(
        data.map((s) => ({
          ...s,
          university_name: (s.universities as unknown as { name: string } | null)?.name ?? '—',
        }))
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function updateField(id: string, field: 'verification_status' | 'contact_status', value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    await supabase.from('students').update({ [field]: value }).eq('id', id)
  }

  async function deleteStudent(id: string) {
    if (!confirm('Delete this student\u2019s data permanently? This cannot be undone.')) return
    const { error } = await supabase.rpc('admin_delete_student', { p_student_id: id })
    if (!error) setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const filtered = rows.filter((r) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return r.full_name.toLowerCase().includes(q) || r.phone_whatsapp.includes(q) || r.university_name.toLowerCase().includes(q)
  })

  return (
    <div>
      <AdminHeader title="Students" subtitle={`${rows.length} registrations loaded (most recent 300).`} />

      <div className="px-6 lg:px-10 py-4 border-b border-hairline">
        <div className="relative max-w-[360px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, university…"
            className="field pl-9 py-2 text-[13px]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] min-w-[900px]">
          <thead>
            <tr className="border-b border-hairline text-muted text-left">
              <th className="px-6 lg:px-10 py-3 font-normal">Name</th>
              <th className="py-3 font-normal">University</th>
              <th className="py-3 font-normal">Course</th>
              <th className="py-3 font-normal">Phone</th>
              <th className="py-3 font-normal">Registered</th>
              <th className="py-3 font-normal">Verification</th>
              <th className="py-3 font-normal">Contact</th>
              <th className="py-3 font-normal"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-6 lg:px-10 py-3">
                  {r.full_name}
                  {r.is_duplicate_flag && <span className="text-danger text-[11px] ml-2">dup?</span>}
                  {r.is_ambassador && <span className="text-lime text-[11px] ml-2">ambassador</span>}
                </td>
                <td className="py-3 text-muted">{r.university_name}</td>
                <td className="py-3 text-muted">{r.course_category}</td>
                <td className="py-3 num text-muted">{r.phone_whatsapp}</td>
                <td className="py-3 num text-muted">{new Date(r.date_registered).toLocaleDateString()}</td>
                <td className="py-3">
                  <select
                    value={r.verification_status}
                    onChange={(e) => updateField(r.id, 'verification_status', e.target.value)}
                    className="bg-transparent border border-hairline px-2 py-1 text-[12px]"
                  >
                    {VERIFICATION_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3">
                  <select
                    value={r.contact_status}
                    onChange={(e) => updateField(r.id, 'contact_status', e.target.value)}
                    className="bg-transparent border border-hairline px-2 py-1 text-[12px]"
                  >
                    {CONTACT_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 pr-6">
                  <button onClick={() => deleteStudent(r.id)} className="text-muted hover:text-danger transition-colors">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <p className="px-6 lg:px-10 py-8 text-muted text-sm">No students match.</p>}
      </div>
    </div>
  )
}
