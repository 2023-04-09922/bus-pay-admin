import { useMemo, useState, type FormEvent } from 'react'
import { apiRequest, ApiError } from '../api/client'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatTzs, qs, useApiResource } from '../lib/hooks'

type CardRow = {
  id: string
  serialNumber: string
  nfcUid: string | null
  status: string
  issuedAt: string
  replaces?: {
    nfcUid: string | null
    status: string
    serialNumber: string
  } | null
  wallet: {
    publicCode: string
    balance: number
    status: string
    customer: {
      firstName: string
      lastName: string
      phone: string
    }
  }
}

type CardsResponse = {
  page: number
  limit: number
  total: number
  cards: CardRow[]
}

type InventoryRow = {
  id: string
  serialNumber: string
  nfcUid: string | null
  status: string
  createdAt: string
}

type InventoryResponse = {
  page: number
  limit: number
  total: number
  items: InventoryRow[]
}

function statusBadge(status: string) {
  if (status === 'ACTIVE' || status === 'IN_STOCK') return 'ok'
  if (
    status === 'FROZEN' ||
    status === 'LOST' ||
    status === 'DAMAGED' ||
    status === 'ISSUED'
  )
    return 'warn'
  return 'bad'
}

export function CardsPage() {
  const [tab, setTab] = useState<'issued' | 'inventory'>('issued')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [invQ, setInvQ] = useState('')
  const [invStatus, setInvStatus] = useState('')
  const [invPage, setInvPage] = useState(1)
  const [serialsText, setSerialsText] = useState('')
  const [invLoading, setInvLoading] = useState(false)
  const [busySerial, setBusySerial] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const path = useMemo(
    () =>
      tab === 'issued'
        ? `/admin/cards${qs({ q, status, page, limit: 50 })}`
        : null,
    [tab, q, status, page],
  )
  const invPath = useMemo(
    () =>
      tab === 'inventory'
        ? `/admin/cards/inventory${qs({ q: invQ, status: invStatus, page: invPage, limit: 50 })}`
        : null,
    [tab, invQ, invStatus, invPage],
  )
  const { data, error, loading, reload } = useApiResource<CardsResponse>(path, [
    tab,
  ])
  const {
    data: invData,
    error: invError,
    loading: invListLoading,
    reload: reloadInv,
  } = useApiResource<InventoryResponse>(invPath, [tab])

  async function cardAction(
    serial: string,
    action: 'freeze' | 'unfreeze' | 'replace',
  ) {
    setBusySerial(serial)
    setActionError(null)
    setActionSuccess(null)
    try {
      if (action === 'replace') {
        const next = window.prompt(
          'New NFC UID from the scanner (example 04:A1:B2:C3:D4:55). The 12-digit card number stays the same.',
        )
        if (next === null) return
        if (!next.trim()) {
          setActionError('NFC UID is required')
          return
        }
        const result = await apiRequest<{
          message: string
          card: { serialNumber: string; nfcUid: string | null }
        }>(`/admin/cards/${encodeURIComponent(serial)}/replace`, {
          method: 'POST',
          body: JSON.stringify({ nfcUid: next.trim() }),
        })
        setActionSuccess(
          `${result.message} Card number ${result.card.serialNumber}. NFC ${result.card.nfcUid ?? ''}`,
        )
      } else {
        await apiRequest(
          `/admin/cards/${encodeURIComponent(serial)}/${action}`,
          { method: 'POST' },
        )
        setActionSuccess(
          action === 'freeze' ? 'Card frozen' : 'Card unfrozen',
        )
      }
      reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Action failed',
      )
    } finally {
      setBusySerial(null)
    }
  }

  const tabs = (
    <div className="tabs">
      <button
        type="button"
        className={`tab${tab === 'issued' ? ' active' : ''}`}
        onClick={() => setTab('issued')}
      >
        Issued
      </button>
      <button
        type="button"
        className={`tab${tab === 'inventory' ? ' active' : ''}`}
        onClick={() => setTab('inventory')}
      >
        Inventory
      </button>
    </div>
  )

  async function onAddInventory(event: FormEvent) {
    event.preventDefault()
    const serials = serialsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (serials.length === 0) {
      setActionError('Enter at least one serial number')
      return
    }
    setInvLoading(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      const result = await apiRequest<{ count: number }>(
        '/admin/cards/inventory',
        {
          method: 'POST',
          body: JSON.stringify({
            items: serials.map((serialNumber) => ({ serialNumber })),
          }),
        },
      )
      setActionSuccess(`Added ${result.count} serial(s) to inventory`)
      setSerialsText('')
      reloadInv()
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not add inventory',
      )
    } finally {
      setInvLoading(false)
    }
  }

  if (tab === 'inventory') {
    return (
      <div className="page">
        <PageHeader
          title="Cards"
          actions={tabs}
        />

        <section className="panel" style={{ marginBottom: '1.25rem' }}>
          <h2>Add stock</h2>
          <form className="card-form wide" onSubmit={onAddInventory}>
            <label>
              Serial numbers (one per line)
              <textarea
                rows={6}
                value={serialsText}
                onChange={(e) => setSerialsText(e.target.value)}
                placeholder={'BP-CARD-0001\nBP-CARD-0002'}
                required
              />
            </label>
            <button className="btn primary" type="submit" disabled={invLoading}>
              {invLoading ? 'Adding…' : 'Add to inventory'}
            </button>
          </form>
        </section>

        <div className="toolbar">
          <input
            placeholder="Search serial or NFC UID…"
            value={invQ}
            onChange={(e) => {
              setInvPage(1)
              setInvQ(e.target.value)
            }}
          />
          <select
            value={invStatus}
            onChange={(e) => {
              setInvPage(1)
              setInvStatus(e.target.value)
            }}
          >
            <option value="">All statuses</option>
            <option value="IN_STOCK">IN_STOCK</option>
            <option value="ISSUED">ISSUED</option>
            <option value="DAMAGED">DAMAGED</option>
          </select>
        </div>

        {invListLoading ? <p className="muted">Loading…</p> : null}
        {invError ? <p className="error">{invError}</p> : null}
        {actionError ? <p className="error">{actionError}</p> : null}
        {actionSuccess ? <p className="success">{actionSuccess}</p> : null}

        <DataTable
          columns={['Serial', 'NFC UID', 'Status', 'Created']}
          empty={!invListLoading && (invData?.items.length ?? 0) === 0}
        >
          {invData?.items.map((item) => (
            <tr key={item.id}>
              <td>
                <code>{item.serialNumber}</code>
              </td>
              <td>{item.nfcUid ? <code>{item.nfcUid}</code> : '—'}</td>
              <td>
                <span className={`badge ${statusBadge(item.status)}`}>
                  {item.status}
                </span>
              </td>
              <td>{formatDate(item.createdAt)}</td>
            </tr>
          ))}
        </DataTable>

        {invData ? (
          <div className="pagination">
            <button
              type="button"
              className="btn ghost sm"
              disabled={invPage <= 1}
              onClick={() => setInvPage((p) => p - 1)}
            >
              Prev
            </button>
            <span className="muted">
              Page {invData.page} · {invData.total} total
            </span>
            <button
              type="button"
              className="btn ghost sm"
              disabled={invData.page * invData.limit >= invData.total}
              onClick={() => setInvPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="Cards"
        actions={tabs}
      />

      <div className="toolbar">
        <input
          placeholder="Search serial, NFC UID, passenger…"
          value={q}
          onChange={(e) => {
            setPage(1)
            setQ(e.target.value)
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="FROZEN">FROZEN</option>
          <option value="REPLACED">REPLACED</option>
          <option value="LOST">LOST</option>
          <option value="DAMAGED">DAMAGED</option>
        </select>
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}
      {actionSuccess ? <p className="success">{actionSuccess}</p> : null}

      <DataTable
        columns={[
          'Card number',
          'NFC UID',
          'Previous NFC',
          'Passenger',
          'Wallet',
          'Balance',
          'Status',
          'Issued',
          'Actions',
        ]}
        empty={!loading && (data?.cards.length ?? 0) === 0}
      >
        {data?.cards.map((c) => (
          <tr key={c.id}>
            <td>
              <code>{c.serialNumber}</code>
            </td>
            <td>{c.nfcUid ? <code>{c.nfcUid}</code> : '—'}</td>
            <td>
              {c.replaces?.nfcUid ? (
                <>
                  <code>{c.replaces.nfcUid}</code>
                  <br />
                  <span className="muted">{c.replaces.status}</span>
                </>
              ) : (
                '—'
              )}
            </td>
            <td>
              {c.wallet.customer.firstName} {c.wallet.customer.lastName}
              <br />
              <span className="muted">{c.wallet.customer.phone}</span>
            </td>
            <td>
              <code>{c.wallet.publicCode}</code>
            </td>
            <td>{formatTzs(c.wallet.balance)}</td>
            <td>
              <span className={`badge ${statusBadge(c.status)}`}>
                {c.status}
              </span>
            </td>
            <td>{formatDate(c.issuedAt)}</td>
            <td>
              <div className="row-actions">
                {c.status === 'ACTIVE' ? (
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={busySerial === c.serialNumber}
                    onClick={() => cardAction(c.serialNumber, 'freeze')}
                  >
                    Freeze
                  </button>
                ) : null}
                {c.status === 'FROZEN' ? (
                  <button
                    type="button"
                    className="btn primary sm"
                    disabled={busySerial === c.serialNumber}
                    onClick={() => cardAction(c.serialNumber, 'unfreeze')}
                  >
                    Unfreeze
                  </button>
                ) : null}
                {(c.status === 'ACTIVE' || c.status === 'FROZEN') ? (
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={busySerial === c.serialNumber}
                    onClick={() => cardAction(c.serialNumber, 'replace')}
                  >
                    Replace
                  </button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      {data ? (
        <div className="pagination">
          <button
            type="button"
            className="btn ghost sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <span className="muted">
            Page {data.page} · {data.total} total
          </span>
          <button
            type="button"
            className="btn ghost sm"
            disabled={data.page * data.limit >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}
