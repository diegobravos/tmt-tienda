/**
 * Normaliza a +569XXXXXXXX.
 * - 9XXXXXXXX (9 dígitos)   → +569XXXXXXXX
 * - 569XXXXXXXX (11 dígitos) → +569XXXXXXXX
 * - +569XXXXXXXX             → sin cambio
 * Elimina espacios, guiones y paréntesis antes de evaluar.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '')
  if (digits.startsWith('569') && digits.length === 11) return '+' + digits
  if (digits.startsWith('9') && digits.length === 9) return '+56' + digits
  return raw.trim()
}
