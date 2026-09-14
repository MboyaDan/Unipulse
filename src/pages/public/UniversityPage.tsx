import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { SiteFooter } from '@/components/SiteFooter'
import { DotCluster } from '@/components/DotCluster'
import { formatNumber } from '@/lib/format'
import type { UniversityProgress } from '@/types'

interface CourseBreakdown {
  course_category: string
  student_count: number
}
interface LeaderboardRow {
  display_name: string
  referral_count: number
}

export default function UniversityPage() {
  const { countryCode, slug } = useParams()
  const [uni, setUni] = useState<UniversityProgress | null>(null)
  const [courses, setCourses] = useState<CourseBreakdown[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!countryCode || !slug) return
    supabase
      .rpc('get_universities_progress', { p_country_code: countryCode.toUpperCase() })
      .then(async ({ data }) => {
        const found = (data as UniversityProgress[] | null)?.find((u) => u.slug === slug)
        if (!found) {
          setNotFound(true)
          return
        }
        setUni(found)
        const [{ data: breakdown }, { data: board }] = await Promise.all([
          supabase.rpc('get_university_course_breakdown', { p_university_id: found.id }),
          supabase.rpc('get_university_leaderboard', { p_university_id: found.id }),
        ])
        if (breakdown) setCourses(breakdown as CourseBreakdown[])
        if (board) setLeaderboard(board as LeaderboardRow[])
      })
  }, [countryCode, slug])

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="container-wide py-6">
          <Logo />
        </header>
        <main className="container-narrow py-16 flex-1">
          <h1 className="font-display font-semibold text-[24px]">We don't have that university yet</h1>
          <p className="text-muted mt-2">Register anyway and we'll add it to the pipeline.</p>
          <Link to="/" className="btn-primary mt-6 inline-flex">
            Register
          </Link>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (!uni) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="container-wide py-6">
          <Logo />
        </header>
        <main className="container-narrow py-16 flex-1 text-muted">Loading…</main>
      </div>
    )
  }

  const remaining = Math.max(uni.community_threshold - uni.current_registrations, 0)
  const totalCourses = courses.reduce((sum, c) => sum + c.student_count, 0)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container-wide py-6">
        <Logo />
      </header>

      <main className="container-narrow pt-8 pb-16 flex-1">
        <p className="text-muted text-[14px]">
          {uni.flag_emoji} {uni.country_name}
          {uni.city ? ` · ${uni.city}` : ''}
        </p>
        <h1 className="font-display font-semibold text-[30px] sm:text-[38px] leading-tight mt-2">{uni.name}</h1>

        <div className="border border-hairline p-6 mt-8">
          {remaining > 0 ? (
            <p className="text-[15px]">
              <span className="num text-lime font-medium">{uni.current_registrations}</span> student
              {uni.current_registrations === 1 ? '' : 's'} registered —{' '}
              <span className="num font-medium">{remaining}</span> more unlock{remaining === 1 ? 's' : ''} the community
            </p>
          ) : (
            <p className="text-[15px]">
              <span className="text-lime font-medium">Community unlocked</span> — {formatNumber(uni.current_registrations)} students
              and counting
            </p>
          )}
          <div className="mt-5">
            <DotCluster filled={uni.current_registrations} total={uni.community_threshold} size="lg" />
          </div>
        </div>

        <Link to="/" className="btn-primary mt-6 w-full sm:w-auto">
          Join the {uni.name} community
        </Link>

        {courses.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display font-semibold text-[18px]">What people are studying</h2>
            <div className="mt-4 space-y-3">
              {courses.map((c) => (
                <div key={c.course_category} className="flex items-center gap-4">
                  <div className="w-36 shrink-0 text-[14px] text-muted truncate">{c.course_category}</div>
                  <div className="flex-1 h-1.5 bg-hairline">
                    <div
                      className="h-full bg-lime"
                      style={{ width: `${totalCourses ? (c.student_count / totalCourses) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="num text-[13px] text-muted w-6 text-right">{c.student_count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {leaderboard.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display font-semibold text-[18px]">Top referrers at {uni.name}</h2>
            <div className="mt-4 divide-y divide-hairline border-t border-hairline">
              {leaderboard.map((row, i) => (
                <div key={row.display_name + i} className="flex items-center justify-between py-3">
                  <span className="text-[14px]">
                    <span className="num text-muted mr-3">{i + 1}</span>
                    {row.display_name}
                  </span>
                  <span className="num text-[14px] text-lime">{row.referral_count} referred</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
