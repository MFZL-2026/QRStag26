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
