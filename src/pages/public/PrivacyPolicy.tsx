import { Logo } from '@/components/Logo'
import { SiteFooter } from '@/components/SiteFooter'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="container-wide py-6">
        <Logo />
      </header>
      <main className="container-narrow pt-8 pb-16 flex-1">
        <h1 className="font-display font-semibold text-[28px]">Privacy policy</h1>
        <div className="mt-6 space-y-5 text-[15px] text-muted leading-relaxed">
          <p>
            UniPulse collects your name, WhatsApp number, university, and course so we can add you to your
            university's student community once enough people from that university have registered.
          </p>
          <p>
            Your name and phone number are never shown publicly. Public university pages only ever display
            aggregate counts (how many people have registered, a course-category breakdown) — never individual
            records. Referral leaderboards show a first name and last initial only.
          </p>
          <p>
            We only contact you about the community you registered for. Any automated message includes a way to
            opt out.
          </p>
          <p>
            You can ask us to delete your data at any time — contact us and we'll remove your record. This
            applies regardless of where you're registering from (UK/EU, Canada, Australia, or the US).
          </p>
          <p>We never sell your data, and we never imply an official university affiliation we don't have.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
