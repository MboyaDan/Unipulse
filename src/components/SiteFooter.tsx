import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline mt-24">
      <div className="container-wide py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-muted">
        <p>© {new Date().getFullYear()} UniPulse. Built for students, by students.</p>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="hover:text-ink transition-colors">
            Privacy policy
          </Link>
          <Link to="/admin/login" className="hover:text-ink transition-colors">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  )
}
