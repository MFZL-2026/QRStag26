import { createClient } from '@supabase/supabase-js'

// Runtime configuration (loaded from /runtime-config.js - editable without rebuild)
declare global {
  interface Window {
    __APP_CONFIG__?: {
      supabaseUrl?: string
      supabaseAnonKey?: string
    }
  }
}

// Fallback values (used if runtime-config.js is missing)
const FALLBACK_URL = 'https://uifcfnkbccluhyryywxe.supabase.co'
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZmNmbmtiY2NsdWh5cnl5d3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDk4ODMsImV4cCI6MjA5Mjg4NTg4M30.c0jZTMmLCW5kNqyWyufHMzObs1pUYskSw1w4VrWTVdU'

const supabaseUrl = (typeof window !== 'undefined' && window.__APP_CONFIG__?.supabaseUrl) || FALLBACK_URL
const supabaseAnonKey = (typeof window !== 'undefined' && window.__APP_CONFIG__?.supabaseAnonKey) || FALLBACK_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database table name
export const CARS_TABLE = 'cars'
export const ADMIN_TABLE = 'admin'

export type TolerantUpsertResult = {
  ok: boolean
  /** Columns the database does not have, so they could not be saved. */
  droppedColumns: string[]
  error: { code?: string; message: string } | null
}

/**
 * Upsert a row without failing when the target table is missing a column.
 *
 * PostgREST rejects the ENTIRE request when the payload contains a key that is
 * not a real column ("Could not find the 'plan' column of 'companies' in the
 * schema cache"). Supabase projects in the wild often carry an older schema
 * than the app expects, so instead of losing the whole save we drop the
 * offending key and retry. The dropped keys are reported back so the UI can
 * tell the user exactly what was not stored.
 */
export async function upsertTolerant(
  table: string,
  payload: Record<string, unknown>,
  options?: { onConflict?: string }
): Promise<TolerantUpsertResult> {
  const body: Record<string, unknown> = { ...payload }
  const droppedColumns: string[] = []

  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await supabase
      .from(table)
      .upsert([body], options?.onConflict ? { onConflict: options.onConflict } : undefined)

    if (!error) {
      return { ok: true, droppedColumns, error: null }
    }

    const message = String(error.message || '')
    const match = message.match(/Could not find the '([^']+)' column/)

    if (error.code === 'PGRST204' && match && match[1] in body) {
      const column = match[1]
      delete body[column]
      droppedColumns.push(column)
      console.warn(`[supabase] column "${column}" does not exist in "${table}" — saving without it`)
      continue
    }

    return { ok: false, droppedColumns, error: { code: error.code, message } }
  }

  return {
    ok: false,
    droppedColumns,
    error: { message: 'Could not save: too many unknown columns in this database schema.' }
  }
}

/**
 * Insert a row, retrying without any column the database does not have.
 * Used for the customer-facing endpoints where a partially applied write is
 * better than a hard failure.
 */
export async function insertTolerant(
  table: string,
  payload: Record<string, unknown> | Record<string, unknown>[]
): Promise<TolerantUpsertResult> {
  const isArray = Array.isArray(payload)
  const rows: Record<string, unknown>[] = isArray
    ? (payload as Record<string, unknown>[]).map(r => ({ ...r }))
    : [{ ...(payload as Record<string, unknown>) }]
  const droppedColumns: string[] = []

  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await supabase.from(table).insert(rows)

    if (!error) {
      return { ok: true, droppedColumns, error: null }
    }

    const message = String(error.message || '')
    const match = message.match(/Could not find the '([^']+)' column/)

    if (error.code === 'PGRST204' && match) {
      const column = match[1]
      // Only drop the column if at least one row actually carries it.
      if (rows.some(r => column in r)) {
        rows.forEach(r => delete r[column])
        droppedColumns.push(column)
        continue
      }
    }

    return { ok: false, droppedColumns, error: { code: error.code, message } }
  }

  return {
    ok: false,
    droppedColumns,
    error: { message: 'Could not save: too many unknown columns in this database schema.' }
  }
}
