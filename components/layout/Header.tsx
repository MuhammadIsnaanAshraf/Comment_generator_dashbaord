interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">{title}</h1>
      {description && (
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{description}</p>
      )}
    </div>
  )
}
