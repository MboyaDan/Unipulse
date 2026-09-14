import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Search, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { SiteFooter } from '@/components/SiteFooter'
import { LiveTicker } from '@/components/LiveTicker'
import { DotCluster } from '@/components/DotCluster'
import { Chip } from '@/components/Chip'
import { COURSE_CATEGORIES, type Country, type CourseCategory, type UniversityProgress } from '@/types'

type Step = 'country' | 'university' | 'course' | 'contact'

const COUNTRY_FLAGS: Record<string, string> = { UK: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺', US: '🇺🇸' }

export default function Home() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [step, setStep] = useState<Step>('country')

  const [countries, setCountries] = useState<Country[]>([])
  const [country, setCountry] = useState<Country | null>(null)

  const [universities, setUniversities] = useState<UniversityProgress[]>([])
  const [uniQuery, setUniQuery] = useState('')
  const [university, setUniversity] = useState<UniversityProgress | null>(null)

  const [category, setCategory] = useState<CourseCategory | null>(null)
  const [exactCourse, setExactCourse] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const remembered = sessionStorage.getItem('unipulse_country')
    supabase
      .from('countries')
      .select('*')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        if (data) {
          setCountries(data as Country[])
          if (remembered) {
            const found = (data as Country[]).find((c) => c.code === remembered)
            if (found) {
              setCountry(found)
              setStep('university')
            }
          }
        }
      })
  }, [])

  useEffect(() => {
    if (!country) return
    supabase
      .rpc('get_universities_progress', { p_country_code: country.code })
      .then(({ data }) => {
        if (data) setUniversities(data as UniversityProgress[])
      })
  }, [country])

  const filteredUniversities = useMemo(() => {
    if (!uniQuery.trim()) return universities.slice(0, 8)
    const q = uniQuery.toLowerCase()
    return universities.filter((u) => u.name.toLowerCase().includes(q) || (u.city ?? '').toLowerCase().includes(q)).slice(0, 8)
  }, [universities, uniQuery])

  function pickCountry(c: Country) {
    setCountry(c)
    sessionStorage.setItem('unipulse_country', c.code)
    setStep('university')
  }

  function pickUniversity(u: UniversityProgress) {
    setUniversity(u)
    setStep('course')
  }

  async function submit() {
    setError(null)
    if (!country || !university || !category) return
    if (!consent) {
      setError('Please confirm you agree to be contacted about the community.')
      return
    }
    setSubmitting(true)
    try {
      const referralCode = params.get('ref') || null
      const { data, error: rpcError } = await supabase.rpc('register_student', {
        p_full_name: fullName,
        p_phone_whatsapp: phone,
        p_country_id: country.id,
        p_university_id: university.id,
        p_course_category: category,
        p_course_exact_text: exactCourse,
        p_acquisition_channel: params.get('utm_source') ? 'Other' : referralCode ? 'Referral' : 'Organic',
        p_utm_source: params.get('utm_source'),
        p_utm_medium: params.get('utm_medium'),
        p_utm_campaign: params.get('utm_campaign'),
        p_consent_given: consent,
        p_referral_code: referralCode,
      })
      if (rpcError) throw rpcError
      navigate(`/success?id=${data}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container-wide py-6 flex items-center justify-between">
        <Logo />
      </header>

      <main className="flex-1">
        {step === 'country' && (
          <section className="container-narrow pt-8 pb-16">
            <LiveTicker />
            <h1 className="font-display font-semibold text-[34px] sm:text-[44px] leading-[1.08] tracking-tight mt-6">
              Your university. Your course. Your community.
            </h1>
            <p className="text-muted text-[16px] leading-relaxed mt-4 max-w-[46ch]">
              Connect with students from your university, get help with hard concepts, and join a community
              built around what you're studying.
            </p>

            <div className="mt-10">
              <p className="field-label">Where do you study?</p>
              <div className="grid grid-cols-2 gap-3">
                {countries.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pickCountry(c)}
                    className="flex items-center gap-3 border border-hairline px-4 py-4 hover:border-lime transition-colors text-left"
                  >
                    <span className="text-2xl">{c.flag_emoji || COUNTRY_FLAGS[c.code]}</span>
                    <span className="font-medium">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep('university')} className="btn-ghost mt-8">
              See who's already joined <ArrowRight size={15} />
            </button>
          </section>
        )}

        {step === 'university' && (
          <section className="container-narrow pt-8 pb-16">
            <BackButton onClick={() => setStep('country')} />
            <h2 className="font-display font-semibold text-[26px] mt-6">Find your university</h2>
            <p className="text-muted text-[15px] mt-2">
              See how many students from your university have already joined.
            </p>

            <div className="relative mt-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" size={18} />
              <input
                autoFocus
                value={uniQuery}
                onChange={(e) => setUniQuery(e.target.value)}
                placeholder="Search your university…"
                className="field pl-11"
              />
            </div>

            <div className="mt-3 divide-y divide-hairline border-t border-hairline">
              {filteredUniversities.map((u) => (
                <button
                  key={u.id}
                  onClick={() => pickUniversity(u)}
                  className="w-full flex items-center justify-between gap-4 py-4 text-left hover:bg-surface transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate group-hover:text-lime transition-colors">{u.name}</div>
                    <div className="text-[13px] text-muted mt-1">
                      {u.city ? `${u.city} · ` : ''}
                      {u.current_registrations >= u.community_threshold ? (
                        <span className="text-lime">Community unlocked</span>
                      ) : (
                        <>
                          <span className="num">{u.current_registrations}</span>/
                          <span className="num">{u.community_threshold}</span>
                          {u.community_threshold - u.current_registrations === 1 ? ' — almost unlocked' : ' joined'}
                        </>
                      )}
                    </div>
                  </div>
                  <DotCluster filled={u.current_registrations} total={u.community_threshold} size="sm" />
                </button>
              ))}
              {filteredUniversities.length === 0 && (
                <p className="py-8 text-center text-muted text-sm">No university matched — check the spelling?</p>
              )}
            </div>
          </section>
        )}

        {step === 'course' && university && (
          <section className="container-narrow pt-8 pb-16">
            <BackButton onClick={() => setStep('university')} />
            <h2 className="font-display font-semibold text-[26px] mt-6">What are you studying?</h2>
            <p className="text-muted text-[15px] mt-2">Pick the closest category, then tell us exactly what it's called.</p>

            <div className="flex flex-wrap gap-2 mt-6">
              {COURSE_CATEGORIES.map((c) => (
                <Chip key={c} label={c} selected={category === c} onClick={() => setCategory(c)} />
              ))}
            </div>

            <div className="mt-6">
              <label className="field-label" htmlFor="exact-course">
                Your exact course title
              </label>
              <input
                id="exact-course"
                value={exactCourse}
                onChange={(e) => setExactCourse(e.target.value)}
                placeholder='e.g. "MSc Data Science"'
                className="field"
              />
            </div>

            <button disabled={!category} onClick={() => setStep('contact')} className="btn-primary mt-8 w-full sm:w-auto">
              Continue <ArrowRight size={16} />
            </button>
          </section>
        )}

        {step === 'contact' && university && (
          <section className="container-narrow pt-8 pb-16">
            <BackButton onClick={() => setStep('course')} />
            <h2 className="font-display font-semibold text-[26px] mt-6">Almost there</h2>
            <p className="text-muted text-[15px] mt-2">
              We'll use your WhatsApp number to add you once {university.name}'s community is live.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="field-label" htmlFor="full-name">
                  Full name
                </label>
                <input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="field" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="field-label" htmlFor="whatsapp">
                  WhatsApp number
                </label>
                <input
                  id="whatsapp"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="field"
                  placeholder="+44 7123 456789"
                  type="tel"
                />
              </div>
              <label className="flex items-start gap-3 text-[14px] text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-lime shrink-0"
                />
                I agree to be contacted about joining the student community.
              </label>
            </div>

            {error && <p className="text-danger text-sm mt-4">{error}</p>}

            <button
              disabled={!fullName || !phone || !consent || submitting}
              onClick={submit}
              className="btn-primary mt-8 w-full sm:w-auto"
            >
              {submitting ? 'Submitting…' : 'Complete registration'} {!submitting && <Check size={16} />}
            </button>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn-ghost">
      <ArrowLeft size={15} /> Back
    </button>
  )
}
