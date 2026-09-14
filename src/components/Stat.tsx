interface StatProps {
  value: string | number
  label: string
  accent?: boolean
}

export function Stat({ value, label, accent = false }: StatProps) {
  return (
    <div>
      <div className={`num text-[28px] sm:text-[34px] font-medium leading-none ${accent ? 'text-lime' : 'text-ink'}`}>
        {value}
      </div>
      <div className="text-[13px] text-muted mt-2">{label}</div>
    </div>
  )
}
