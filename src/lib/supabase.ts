import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uifcfnkbccluhyryywxe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZmNmbmtiY2NsdWh5cnl5d3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDk4ODMsImV4cCI6MjA5Mjg4NTg4M30.c0jZTMmLCW5kNqyWyufHMzObs1pUYskSw1w4VrWTVdU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database table name
export const CARS_TABLE = 'cars'
export const ADMIN_TABLE = 'admin'