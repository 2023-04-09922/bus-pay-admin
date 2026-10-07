type Props = {
  title: string
}

export function PlaceholderPage({ title }: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
        </div>
      </header>
    </div>
  )
}
