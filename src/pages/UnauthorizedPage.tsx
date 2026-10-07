import { Link } from 'react-router-dom'

export function UnauthorizedPage() {
  return (
    <div className="page">
      <h1>403</h1>
      <p>You do not have permission to open this page.</p>
      <Link to="/" className="btn">
        Back to dashboard
      </Link>
    </div>
  )
}
