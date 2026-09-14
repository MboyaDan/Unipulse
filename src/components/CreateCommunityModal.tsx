import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { UniversityFull } from '@/types'

interface Props {
  university: UniversityFull
  onClose: () => void
  onCreated: () => void
}

export function CreateCommunityModal({ university, onClose, onCreated }: Props) {
  const [whatsappLink, setWhatsappLink] = useState('')
  const [communityName, setCommunityName] = useState(`UniPulse @ ${university.name}`)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!whatsappLink.trim()) {
      setError('Add the WhatsApp invite link.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error: uniError } = await supabase
        .from('universities')
        .update({
          whatsapp_link: whatsappLink.trim(),
          community_name: communityName.trim(),
          community_admin_notes: notes.trim() || null,
          community_status: 'Active',
          updated_by: user?.id ?? null,
        })
        .eq('id', university.id)
      if (uniError) throw uniError

      const { error: communityError } = await supabase.from('communities').upsert(
        {
          university_id: university.id,
          whatsapp_link: whatsappLink.trim(),
          status: 'Active',
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        },
        { onConflict: 'university_id' }
      )
      if (communityError) throw communityError

      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the community.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-hairline max-w-[480px] w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display font-semibold text-[18px]">Create community</h2>
            <p className="text-muted text-[13px] mt-1">{university.name}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-[13px] text-muted border border-hairline p-3">
          <span>
            Students: <span className="num text-ink">{university.current_registrations}</span>
          </span>
          <span>
            Threshold: <span className="num text-ink">{university.community_threshold}</span>
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="field-label">WhatsApp invite link</label>
            <input value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)} className="field" placeholder="https://chat.whatsapp.com/…" />
          </div>
          <div>
            <label className="field-label">Community name</label>
            <input value={communityName} onChange={(e) => setCommunityName(e.target.value)} className="field" />
            <p className="text-[12px] text-faint mt-1.5">Avoid implying official university affiliation.</p>
          </div>
          <div>
            <label className="field-label">Admin notes (internal only)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="field" rows={3} />
          </div>
        </div>

        {error && <p className="text-danger text-sm mt-4">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Creating…' : 'Create community'}
          </button>
        </div>
      </div>
    </div>
  )
}
