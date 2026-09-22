type Props = {
  columns: string[]
  children: React.ReactNode
  empty?: boolean
  emptyText?: string
}

export function DataTable({
  columns,
  children,
  empty,
  emptyText = 'No records found',
}: Props) {
  if (empty) {
    return <p className="muted">{emptyText}</p>
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
