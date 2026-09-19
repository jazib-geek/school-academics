/**
 * Pick the first plausible Pakistan mobile from a contact field.
 * Fields often contain two numbers joined by / or spaces; stripping all
 * non-digits would concatenate them into an invalid WhatsApp id.
 */
export function normalizeWhatsAppPhone(raw) {
  if (!raw) return null

  const chunks = String(raw)
    .split(/[/|,;+]|\s{2,}|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean)

  const candidates = chunks.length > 0 ? chunks : [String(raw)]

  for (const chunk of candidates) {
    const phone = toWhatsAppE164(chunk)
    if (phone) return phone
  }

  // Fallback: scan for an 11-digit local or 12-digit 92… sequence inside the whole string
  const digits = String(raw).replace(/\D/g, '')
  const localMatch = digits.match(/0?3\d{9}/)
  if (localMatch) return toWhatsAppE164(localMatch[0])
  const intlMatch = digits.match(/923\d{9}/)
  if (intlMatch) return intlMatch[0]

  return null
}

/** Convert local/intl Pakistan mobile to WhatsApp E.164 digits (no +). */
export function toWhatsAppE164(value) {
  let digits = String(value || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('00')) digits = digits.slice(2)

  // 03XXXXXXXXX → 923XXXXXXXXX
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `92${digits.slice(1)}`
  }

  // 3XXXXXXXXX (10 digits, missing leading 0)
  if (digits.length === 10 && digits.startsWith('3')) {
    digits = `92${digits}`
  }

  // Already 923XXXXXXXXX
  if (/^923\d{9}$/.test(digits)) return digits

  return null
}

/** WhatsApp Web chat URL for a raw contact string, or null if invalid. */
export function buildWhatsAppWebUrl(rawPhone, text) {
  const phone = normalizeWhatsAppPhone(rawPhone)
  if (!phone) return null
  const base = `https://web.whatsapp.com/send?phone=${phone}`
  if (text == null || text === '') return base
  return `${base}&text=${encodeURIComponent(text)}`
}
