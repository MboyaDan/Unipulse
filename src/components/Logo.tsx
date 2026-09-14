import { Link } from 'react-router-dom'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 group ${className}`}>
      <span className="grid grid-cols-2 gap-[3px] w-[18px] h-[18px]">
        <span className="bg-lime rounded-full" />
        <span className="bg-hairline rounded-full group-hover:bg-lime/40 transition-colors" />
        <span className="bg-hairline rounded-full group-hover:bg-lime/40 transition-colors" />
        <span className="bg-lime rounded-full" />
      </span>
      <span className="font-display font-semibold text-[17px] tracking-tight text-ink">Cohort</span>
    </Link>
  )
}
