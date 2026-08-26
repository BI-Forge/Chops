/** Format a date picker value for API query params (RFC3339 UTC). */
export function formatDateForAPI(dateStr: string): string {
  if (!dateStr) return ''

  if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.match(/[+-]\d{2}:\d{2}$/))) {
    return dateStr
  }

  let date: Date
  if (dateStr.includes('T')) {
    const [datePart, timePart] = dateStr.split('T')
    const [hours = '00', minutes = '00'] = timePart.split(':')
    date = new Date(`${datePart}T${hours}:${minutes}:00`)
  } else {
    date = new Date(`${dateStr}T00:00:00`)
  }

  if (isNaN(date.getTime())) {
    return ''
  }

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`
}
