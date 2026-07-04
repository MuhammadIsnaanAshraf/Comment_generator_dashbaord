'use client'

import type { PostCategory } from '../../types'

const filters: { label: string; value: PostCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Professional', value: 'professional' },
  { label: 'Casual', value: 'casual' },
  { label: 'Hiring', value: 'hiring' },
  { label: 'Achievement', value: 'achievement' },
]

interface Props {
  selected: PostCategory | 'all'
  onChange: (v: PostCategory | 'all') => void
}

export function FilterBar({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={[
            'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors duration-150',
            selected === value
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
              : 'bg-transparent text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
