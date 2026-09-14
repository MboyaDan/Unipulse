interface DotClusterProps {
  filled: number
  total: number
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Reused everywhere: homepage hero, university search results, public
 * university pages, and the admin pipeline. One dot per seat toward the
 * community threshold. This replaces generic progress bars per the brief.
 */
export function DotCluster({ filled, total, size = 'md' }: DotClusterProps) {
  const dotSize = size === 'lg' ? 'w-4 h-4' : size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
  const gap = size === 'lg' ? 'gap-2.5' : size === 'sm' ? 'gap-1' : 'gap-1.5'
  const safeTotal = Math.max(total, 1)
  const dots = Array.from({ length: safeTotal }, (_, i) => i < filled)

  return (
    <div className={`flex flex-wrap ${gap}`} role="img" aria-label={`${filled} of ${total} joined`}>
      {dots.map((isFilled, i) => (
        <span
          key={i}
          className={`${dotSize} rounded-full shrink-0 ${
            isFilled ? 'bg-lime animate-fillin' : 'bg-hairline'
          }`}
          style={isFilled ? { animationDelay: `${i * 40}ms` } : undefined}
        />
      ))}
    </div>
  )
}
