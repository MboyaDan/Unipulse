export function AdminHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-6 lg:px-10 pt-8 pb-2">
      <h1 className="font-display font-semibold text-[24px]">{title}</h1>
      {subtitle && <p className="text-muted text-[14px] mt-1.5">{subtitle}</p>}
    </div>
  )
}
