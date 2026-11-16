// Telemetry captured when a customer scans a QR code.
//
// Everything here is read from the browser without asking for anything - no
// location permission prompt, no cookies, no third-party call. The scan is
// already an opt-in act by the customer (they chose to scan the sticker), and
// the dealer needs to know which showroom and which kind of device the scan
// came from.

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export function detectDeviceType(): DeviceType {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua)) return 'tablet'
  if (/Mobi|iPhone|Android/i.test(ua)) return 'mobile'
  return 'desktop'
}

/**
 * The customer's IANA timezone, e.g. "Asia/Baghdad". It is a coarse signal for
 * where the scan came from, but it is free, silent and needs no permission.
 */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return ''
  }
}

/** The argument object for the record_scan RPC. */
export function scanTelemetry(): {
  p_device_type: DeviceType
  p_user_agent: string
  p_timezone: string
} {
  return {
    p_device_type: detectDeviceType(),
    p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    p_timezone: detectTimezone()
  }
}

/**
 * The plain-insert fallback, in database column names. Only columns that have
 * always existed are used, so this still works against an older database that
 * has no record_scan function and no scanner_timezone column.
 */
export function telemetryFallbackColumns(): {
  device_type: DeviceType
  user_agent: string
} {
  return {
    device_type: detectDeviceType(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
  }
}

/** A short, readable label for a timezone, e.g. "Asia/Baghdad" -> "Baghdad". */
export function timezoneLabel(timezone: string): string {
  if (!timezone) return 'Unknown'
  const city = timezone.split('/').pop() || timezone
  return city.replace(/_/g, ' ')
}
