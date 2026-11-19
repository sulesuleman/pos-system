// Shared client-side validation for the person-detail fields every "create a person" form in
// this app collects (CreateMartDialog's Owner, CreateStaffDialog's Manager) - mirrors the
// backend's own validation in MartsEndpoints.Validate/StaffEndpoints.Validate exactly, so a bad
// value is rejected before the round trip instead of only server-side.

export const REQUIRED_MESSAGE = 'This field is required.'
export const INVALID_EMAIL_MESSAGE = 'Enter a valid email address.'
export const INVALID_CONTACT_MESSAGE = 'Enter a valid phone number.'
export const INVALID_CNIC_MESSAGE = 'Enter a complete CNIC in the form 12345-1234567-1.'

// A well-formed-enough email address: something@something.something, no whitespace.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Digits, optional leading "+" for a country code, 7-15 digits total — lenient, not a strict
// carrier/region check.
export const CONTACT_PATTERN = /^\+?\d{7,15}$/
// Canonical Pakistani CNIC shape: 5 digits, dash, 7 digits, dash, 1 digit.
export const CNIC_PATTERN = /^\d{5}-\d{7}-\d{1}$/

// Strips everything but digits, keeps at most 13, and re-inserts dashes after the 5th and 12th
// digit — the canonical Pakistani CNIC shape (NNNNN-NNNNNNN-N), applied as the user types.
export function formatCnic(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  const area = digits.slice(0, 5)
  const family = digits.slice(5, 12)
  const check = digits.slice(12, 13)
  let formatted = area
  if (family !== '') {
    formatted += `-${family}`
  }
  if (check !== '') {
    formatted += `-${check}`
  }
  return formatted
}

// Maps a cursor position in the raw (unformatted) input to the equivalent position in the
// formatted string, counted by digits seen so far — so a cursor sitting between two digits stays
// between the same two digits after dashes are inserted/removed around it.
export function mapCnicCursor(rawValue: string, rawCursor: number, formatted: string): number {
  const digitsBeforeCursor = rawValue.slice(0, rawCursor).replace(/\D/g, '').length
  if (digitsBeforeCursor === 0) {
    return 0
  }
  let digitsSeen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      digitsSeen++
      if (digitsSeen === digitsBeforeCursor) {
        return i + 1
      }
    }
  }
  return formatted.length
}
