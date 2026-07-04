import type { PostCategory } from '../../types'

const categoryConfig: Record<PostCategory, { label: string; cls: string }> = {
  professional: { label: 'Professional', cls: 'bg-blue-900/40 text-blue-300 border-blue-700/50' },
  casual: { label: 'Casual', cls: 'bg-zinc-800 text-zinc-300 border-zinc-600' },
  hiring: { label: 'Hiring', cls: 'bg-green-900/40 text-green-300 border-green-700/50' },
  achievement: { label: 'Achievement', cls: 'bg-amber-900/40 text-amber-300 border-amber-700/50' },
  unknown: { label: 'Unknown', cls: 'bg-zinc-800 text-zinc-400 border-zinc-600' },
}

export function CategoryBadge({ category }: { category: PostCategory }) {
  const cfg = categoryConfig[category] ?? categoryConfig.unknown
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  )
}
