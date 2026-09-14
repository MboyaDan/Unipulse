import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'

export default function AdminLogin() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) {
    const from = (location.state as { from?: string })?.from || '/admin'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error)
    else navigate('/admin')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5">
      <Logo className="mb-10" />
      <form onSubmit={handleSubmit} className="w-full max-w-[380px]">
        <h1 className="font-display font-semibold text-[22px] mb-6">Admin sign in</h1>
        <div className="space-y-4">
          <div>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" required />
          </div>
          <div>
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              required
            />
          </div>
        </div>
        {error && <p className="text-danger text-sm mt-4">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full mt-6">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-muted text-[13px] mt-6">
          Admin accounts are created in Supabase Authentication — see the README for setup steps.
        </p>
      </form>
    </div>
  )
}
