import { formatMoneyInput } from '../lib/hooks'

type Props = {
  value: string
  onChange: (formatted: string) => void
  placeholder?: string
  required?: boolean
}

export function MoneyInput({
  value,
  onChange,
  placeholder,
  required,
}: Props) {
  return (
    <input
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      required={required}
      value={value}
      onChange={(e) => onChange(formatMoneyInput(e.target.value))}
    />
  )
}
