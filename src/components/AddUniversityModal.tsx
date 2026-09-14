import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { slugify } from '@/lib/format'

interface Country {
  id: string
  name: string
  code: string
}

interface Props {
  onClose: () => void
  onCreated: () => void
}

export function AddUniversityModal({ onClose, onCreated }: Props) {
  const [countries, setCountries] = useState<Country[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [countryId, setCountryId] = useState('')
  const [city, setCity] = useState('')
  const [threshold, setThreshold] = useState(5)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('countries')
      .select('id, name, code')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        if (data) {
          setCountries(data)
          if (data.length > 0) setCountryId(data[0].id)
        }
      })
  }, [])

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  async function save() {
    if (!name.trim()) {
      setError('Enter the university name.')
      return
    }
    if (!slug.trim()) {
      setError('Enter a URL slug.')
      return
    }
    if (!countryId) {
      setError('Choose a country.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error: insertError } = await supabase.from('universities').insert({
        name: name.trim(),
        slug: slug.trim(),
        country_id: countryId,
        city: city.trim() || null,
        community_threshold: threshold,
        data_confidence: 'unavailable',
        priority_tier: 3,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      })

      if (insertError) throw insertError
      onCreated()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not add the university — the slug may already be taken.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-hairline max-w-[480px] w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display font-semibold text-[18px]">Add university</h2>
            <p className="text-muted text-[13px] mt-1">
              Starts at priority tier 3 with no stats — score it once you have verified numbers.
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="field-label">Country</label>
            <select value={countryId} onChange={(e) => setCountryId(e.target.value)} className="field">
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">University name</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="field"
              placeholder="University of Phoenix"
              autoFocus
            />
          </div>
          <div>
            <label className="field-label">URL slug</label>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value)
                setSlugTouched(true)
              }}
              className="field"
            />
            <p className="text-[12px] text-faint mt-1.5">
              Public page will be at /{countries.find((c) => c.id === countryId)?.code.toLowerCase() ?? '..'}/{slug || '...'}
            </p>
          </div>
          <div>
            <label className="field-label">City (optional)</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="field" placeholder="Phoenix, AZ" />
          </div>
          <div>
            <label className="field-label">Community threshold</label>
            <input
              type="number"
              min={1}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="field"
            />
          </div>
        </div>

        {error && <p className="text-danger text-sm mt-4">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Adding…' : 'Add university'}
          </button>
        </div>
      </div>
    </div>
  )
}