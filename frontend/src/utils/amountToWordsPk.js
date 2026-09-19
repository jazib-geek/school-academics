/** Pakistani / South-Asian style amount in words (Lac / Crore). */
const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n) {
  if (n < 20) return ONES[n]
  const t = Math.floor(n / 10)
  const o = n % 10
  return `${TENS[t]}${o ? ` ${ONES[o]}` : ''}`.trim()
}

function threeDigits(n) {
  if (n < 100) return twoDigits(n)
  const h = Math.floor(n / 100)
  const rest = n % 100
  return `${ONES[h]} Hundred${rest ? ` ${twoDigits(rest)}` : ''}`.trim()
}

/**
 * @param {number|string} value
 * @returns {string}
 */
export function amountToWordsPk(value) {
  let n = Math.round(Number(value || 0))
  if (!Number.isFinite(n) || n < 0) n = 0
  if (n === 0) return 'Zero .'

  const parts = []
  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lac = Math.floor(n / 100000)
  n %= 100000
  const thousand = Math.floor(n / 1000)
  n %= 1000

  if (crore) parts.push(`${threeDigits(crore)} Crore`)
  if (lac) parts.push(`${twoDigits(lac)} Lac`)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  if (n) {
    const last = threeDigits(n)
    if (parts.length && n < 100) parts.push(`And ${last}`)
    else if (parts.length && n >= 100) {
      const h = Math.floor(n / 100)
      const rest = n % 100
      parts.push(
        rest
          ? `${ONES[h]} Hundred And ${twoDigits(rest)}`
          : `${ONES[h]} Hundred`,
      )
    } else {
      parts.push(last)
    }
  }

  return `${parts.join(' ')} .`
}
