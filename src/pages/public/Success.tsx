import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Share2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { SiteFooter } from '@/components/SiteFooter'
import { DotCluster } from '@/components/DotCluster'
import { ordinal } from '@/lib/format'
import type { RegistrationReceipt } from '@/types'

export default function Success() {
  const [params] = useSearchParams()
  const studentId = params.get('id')
  const [receipt, setReceipt] = useState<RegistrationReceipt | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!studentId) return
    supabase
      .rpc('get_registration_receipt', { p_student_id: studentId })
      .then(({ data }) => {
        if (data && data[0]) setReceipt(data[0] as RegistrationReceipt)
      })
    // Refresh once after a short delay in case triggers hadn't finished caching counts
    const t = setTimeout(() => {
      supabase
        .rpc('get_registration_receipt', { p_student_id: studentId })
        .then(({ data }) => {
          if (data && data[0]) setReceipt(data[0] as RegistrationReceipt)
        })
    }, 1500)
    return () => clearTimeout(t)
  }, [studentId])

  const shareUrl = receipt ? `${window.location.origin}/?ref=${receipt.referral_code}` : ''
  const shareText = receipt
    ? `I just joined the ${receipt.university_name} student community waitlist on UniPulse — join me: ${shareUrl}`
    : ''

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, url: shareUrl })
        return
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    await navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!studentId) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="container-wide py-6">
          <Logo />
        </header>
        <main className="container-narrow py-16 flex-1">
          <p className="text-muted">Nothing to see here yet.</p>
          <Link to="/" className="btn-primary mt-6 inline-flex">
            Register
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container-wide py-6">
        <Logo />
      </header>

      <main className="container-narrow pt-8 pb-16 flex-1">
        <h1 className="font-display font-semibold text-[30px] sm:text-[36px]">You're on the list 🎉</h1>

        {receipt ? (
          <>
            <p className="text-muted mt-3">
              {receipt.full_name.split(' ')[0]}, you're registered for the{' '}
              <span className="text-ink font-medium">{receipt.university_name}</span> community as a{' '}
              <span className="text-ink font-medium">{receipt.course_category}</span> student.
            </p>

            <div className="border border-hairline p-6 mt-8">
              <p className="text-[15px]">
                You're the{' '}
                <span className="num text-lime font-medium">{ordinal(receipt.position_at_university)}</span> person from{' '}
                {receipt.university_name}
                {receipt.community_threshold - receipt.current_registrations > 0 ? (
                  <>
                    {' — '}
                    <span className="num font-medium">{receipt.community_threshold - receipt.current_registrations}</span> more
                    unlocks the community
                  </>
                ) : (
                  ' — the community is unlocked!'
                )}
              </p>
              <div className="mt-5">
                <DotCluster filled={receipt.current_registrations} total={receipt.community_threshold} size="lg" />
              </div>
            </div>

            <div className="mt-8">
              <h2 className="font-display font-semibold text-[18px]">Invite a coursemate to speed this up</h2>
              <p className="text-muted text-[14px] mt-1.5">
                Every friend who joins from {receipt.university_name} moves the counter forward.
              </p>
              <button onClick={share} className="btn-primary mt-4">
                <Share2 size={16} /> {copied ? 'Link copied' : 'Share invite link'}
              </button>
            </div>

            <p className="text-muted text-[13px] mt-10">
              We'll message your WhatsApp once the community is created — no link is shared until then.
            </p>
          </>
        ) : (
          <p className="text-muted mt-4">Loading your registration…</p>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
