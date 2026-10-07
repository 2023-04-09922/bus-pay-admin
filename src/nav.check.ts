import { canAccess, visibleNav } from './nav.ts'

const master = ['DASHBOARD_VIEW', 'WAKALA_VIEW', 'WAKALA_CREATE', 'CONDUCTOR_VIEW']

const sections = visibleNav('master_agent', master)
const labels = sections.flatMap((section) => section.items.map((item) => item.label))

if (!labels.includes('Dashboard')) throw new Error('dashboard missing')
if (!labels.includes('Wakala')) throw new Error('wakala missing')
if (!labels.includes('Register Wakala')) throw new Error('register wakala missing')
if (labels.includes('Revenue')) throw new Error('financial menu should be hidden')
if (labels.includes('Permissions')) throw new Error('permissions menu should be hidden')
if (labels.includes('Master Wakala List')) throw new Error('master menu should be hidden')

const viewOnly = visibleNav('master_agent', ['WAKALA_VIEW', 'DASHBOARD_VIEW'])
const viewLabels = viewOnly.flatMap((section) => section.items.map((item) => item.label))
if (viewLabels.includes('Register Wakala')) throw new Error('register should be absent')
if (!viewLabels.includes('Wakala')) throw new Error('wakala list should stay')

const adminLabels = visibleNav('admin', []).flatMap((section) =>
  section.items.map((item) => item.label),
)
if (!adminLabels.includes('Permissions')) throw new Error('admin permissions missing')
if (!adminLabels.includes('Company Finance')) throw new Error('admin finance missing')
if (canAccess('master_agent', master, ['FINANCIAL_COMPANY_VIEW'])) {
  throw new Error('expected financial denial')
}
if (!canAccess('admin', [], ['FINANCIAL_COMPANY_VIEW'])) {
  throw new Error('admin should pass')
}

console.log('admin nav checks passed')
