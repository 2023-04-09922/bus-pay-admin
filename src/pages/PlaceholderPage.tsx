type Props = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      <div className="panel">
        <p className="muted">
          This section is stubbed for Phase 1B. The NestJS admin API endpoints
          are ready — wire list/filter screens here next.
        </p>
      </div>
    </div>
  )
}
