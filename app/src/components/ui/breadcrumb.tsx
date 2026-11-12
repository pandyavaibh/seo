import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-[6px] text-[12.5px] text-ink-muted">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-[6px]">
          {i > 0 && <ChevronRight size={12} className="text-ink-faint flex-none" />}
          {item.to ? (
            <Link to={item.to} className="text-ink-muted hover:text-brand no-underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
