import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="container-wide py-6">
        <Logo />
      </header>
      <main className="container-narrow py-24 flex-1">
        <h1 className="font-display font-semibold text-[28px]">Page not found</h1>
        <p className="text-muted mt-2">That link doesn't lead anywhere.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          Go home
        </Link>
      </main>
    </div>
  )
}
