interface ChipProps {
  label: string
  selected: boolean
  onClick: () => void
}

export function Chip({ label, selected, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`px-4 py-2.5 text-[14px] border transition-colors ${
        selected
          ? 'bg-lime border-lime text-base font-medium'
          : 'bg-transparent border-hairline text-muted hover:border-ink hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
