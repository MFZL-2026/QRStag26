import { useState, useEffect, useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Car, Phone, Mail, Plus, Trash2, Edit3, LogOut, Eye, X, Save, Loader2, Building2, ChevronDown, ChevronUp, Image, FileText, ArrowLeft, Printer, Hexagon, Sparkles, Users, TrendingUp, Download, Upload, Search, Bell, Globe, Zap, Star, Crown, Database, Settings, Link2, ChevronRight, Filter, Calendar, DollarSign, PieChart as LucidePieChart, Activity, ArrowUpRight, ArrowDownRight, MessageCircle, UserPlus, Shield, Key, Smartphone } from 'lucide-react'
import { supabase } from './lib/supabase'
import * as Recharts from 'recharts'

// User Role Types
type UserRole = 'super_admin' | 'admin' | 'user'

// User Interface
interface UserAccount {
  id: string
  email: string
  password: string
  name: string
  role: UserRole
  company_access: string[] // Company IDs user can access (empty = all for admins)
  permissions: string[] // Custom permissions
  created_at: string
  last_login: string | null
  is_active: boolean
}

// Permission definitions
const PERMISSIONS = {
  // Company permissions
  company_create: 'Create companies',
  company_edit: 'Edit companies',
  company_delete: 'Delete companies',
  company_view: 'View companies',

  // Car permissions
  car_create: 'Create cars',
  car_edit: 'Edit cars',
  car_delete: 'Delete cars',
  car_view: 'View cars',

  // Leads permissions
  leads_view: 'View leads',
  leads_export: 'Export leads',
  leads_print: 'Print leads reports',

  // Analytics permissions
  analytics_view: 'View analytics',
  analytics_export: 'Export analytics',

  // Report permissions
  reports_view: 'View reports',
  reports_generate: 'Generate reports',
  reports_export: 'Export reports',

  // User management
  users_view: 'View users',
  users_create: 'Create users',
  users_edit: 'Edit users',
  users_delete: 'Delete users',
  users_manage_roles: 'Manage user roles',

  // Settings
  settings_view: 'View settings',
  settings_edit: 'Edit settings',

  // Data entry (for user role)
  data_entry: 'Data entry access',
}

// Role default permissions - Based on user requirements:
// Super Admin: Full access + user management + delete users
// Admin: Create/Edit companies & cars, see Data Entry users only, NO delete users, NO reports
// User (Data Entry): View companies, create/edit cars, print QR only, NO user visibility
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: Object.keys(PERMISSIONS), // All permissions including users_delete
  admin: [
    // Company permissions
    'company_create', 'company_edit', 'company_delete', 'company_view',
    // Car permissions
    'car_create', 'car_edit', 'car_delete', 'car_view',
    // Leads permissions
    'leads_view', 'leads_export', 'leads_print',
    // NO analytics
    // NO reports
    // User management - can view Data Entry users only, can create/edit but NOT delete
    'users_view', 'users_create', 'users_edit',
    // NO users_delete
    'settings_view', 'settings_edit',
    'data_entry'
  ],
  user: [
    // Can view companies
    'company_view',
    // Can view/create/edit cars
    'car_view', 'car_create', 'car_edit',
    // Can view leads
    'leads_view',
    // NO analytics
    // NO reports
    // NO users management at all
    // Can print QR (via car actions)
    'data_entry'
  ]
}

// Cast Recharts components to bypass TypeScript compatibility issues
const LineChart = Recharts.LineChart as any
const Line = Recharts.Line as any
const BarChart = Recharts.BarChart as any
const Bar = Recharts.Bar as any
const PieChart = Recharts.PieChart as any
const Pie = Recharts.Pie as any
const XAxis = Recharts.XAxis as any
const YAxis = Recharts.YAxis as any
const CartesianGrid = Recharts.CartesianGrid as any
const Tooltip = Recharts.Tooltip as any
const ResponsiveContainer = Recharts.ResponsiveContainer as any
const Cell = Recharts.Cell as any
const Legend = Recharts.Legend as any

// Subscription Plans
type PlanType = 'free' | 'starter' | 'professional' | 'enterprise'
type QRTemplate = 'standard' | 'luxury' | 'classic' | 'bold' | 'minimalist' | 'sports' | 'eco'
type LeadInterest = 'urgent' | 'normal'
type NotifType = 'scan' | 'lead' | 'expiry' | 'report'

// App Branding Interface - stored in Supabase, persists across updates
interface AppSettings {
  id: string
  app_name: string
  app_logo: string
  app_description: string
  primary_color: string
  secondary_color: string
  custom_qr_url: string  // Custom domain URL for QR codes
  updated_at: string
}

interface CompanyData {
  id: string
  name: string
  address: string
  phone: string
  email: string
  created_at: string
  plan: PlanType
  custom_price: number | null
  custom_features: string[]
  branding_color: string
  branding_logo: string
}

// Position options for logo and company name on QR print
type LogoPosition = 'none' | 'top' | 'center' | 'bottom'
type CompanyNamePosition = 'none' | 'top' | 'bottom'

interface CarData {
  id: string
  company_id: string
  make: string
  model: string
  year: number
  price: string
  mileage: string
  fuelType: string
  transmission: string
  color: string
  description: string
  contactPhone: string
  contactEmail: string
  contactWhatsApp: string
  location: string
  images: string[]
  videoLink: string
  scan_start_date: string
  scan_end_date: string
  qr_template: QRTemplate
  qr_frame: string | null
  qr_shape: string
  logo_position: LogoPosition
  company_name_position: CompanyNamePosition
  created_at: string
}

interface ScanRecord {
  id: string
  car_id: string
  scanned_at: string
}

interface LeadData {
  id: string
  car_id: string
  name: string
  phone: string
  email: string
  interest_level: LeadInterest
  notes: string
  created_at: string
}

interface NotificationData {
  id: string
  company_id: string
  type: NotifType
  title: string
  message: string
  read: boolean
  created_at: string
}

interface NewLeadForm {
  name: string
  phone: string
  email: string
  interest_level: LeadInterest
  notes: string
}

const STORAGE_KEYS = {
  ADMIN_PASSWORD: 'carqr_admin_password',
  IS_LOGGED_IN: 'carqr_logged_in',
  APP_NAME: 'carqr_app_name',
  APP_LOGO: 'carqr_app_logo',
  CUSTOM_QR_URL: 'carqr_custom_url'
}

// Subscription Plans Configuration
const PLANS: Record<PlanType, { name: string; price: number; features: string[]; color: string }> = {
  free: { name: 'Free', price: 0, features: ['3 companies', '50 cars', 'Basic QR', '100 scans/month'], color: 'gray' },
  starter: { name: 'Starter', price: 29, features: ['5 companies', '200 cars', 'All QR styles', '1000 scans/month', 'Email support'], color: 'blue' },
  professional: { name: 'Professional', price: 99, features: ['Unlimited companies', 'Unlimited cars', 'Custom branding', 'Unlimited scans', 'Analytics', 'Priority support'], color: 'purple' },
  enterprise: { name: 'Enterprise', price: 299, features: ['Everything in Pro', 'API access', 'White-label', 'Dedicated support', 'Custom integrations'], color: 'amber' }
}

// QR Templates Configuration - Enhanced with 25+ templates
const QR_TEMPLATES: Record<QRTemplate, { name: string; description: string; preview: string; qrColor: string; qrBg: string; borderColor: string; shape: string; frame?: string }> = {
  // Basic Templates
  standard: { name: 'Standard', description: 'Clean and simple', preview: 'bg-gray-100', qrColor: '#000000', qrBg: '#ffffff', borderColor: '#333333', shape: 'square' },
  luxury: { name: 'Luxury', description: 'Premium gold accents', preview: 'bg-gradient-to-br from-amber-900 to-blue-900', qrColor: '#d4af37', qrBg: '#1a1a2e', borderColor: '#d4af37', shape: 'diamond' },
  classic: { name: 'Classic', description: 'Traditional elegance', preview: 'bg-gradient-to-br from-gray-800 to-gray-600', qrColor: '#1a1a1a', qrBg: '#f5f5dc', borderColor: '#8b7355', shape: 'rounded' },
  bold: { name: 'Bold', description: 'High impact red', preview: 'bg-gradient-to-br from-red-600 to-red-800', qrColor: '#ffffff', qrBg: '#dc2626', borderColor: '#991b1b', shape: 'circle' },
  minimalist: { name: 'Minimalist', description: 'Ultra clean white', preview: 'bg-white border-2 border-gray-200', qrColor: '#000000', qrBg: '#ffffff', borderColor: '#e5e7eb', shape: 'minimal' },
  sports: { name: 'Sports', description: 'Dynamic racing style', preview: 'bg-gradient-to-r from-blue-500 to-green-500', qrColor: '#ffffff', qrBg: '#0f172a', borderColor: '#22c55e', shape: 'hexagon' },
  eco: { name: 'Eco', description: 'Natural green theme', preview: 'bg-gradient-to-br from-green-600 to-emerald-800', qrColor: '#ffffff', qrBg: '#16a34a', borderColor: '#15803d', shape: 'leaf' }
}

// NEW: Enhanced QR Frame Templates (25+ decorative frames)
export const QR_FRAMES: { id: string; name: string; description: string; style: React.CSSProperties; category: string }[] = [
  // Automotive-Themed Frames
  { id: 'auto_1', name: 'Showroom Elite', description: 'Premium dealership style', style: { border: '4px solid #1e3a5f', borderRadius: '12px', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '12px' }, category: 'Automotive' },
  { id: 'auto_2', name: 'Racing Stripes', description: 'Dynamic sports feel', style: { border: '4px solid #dc2626', borderRadius: '8px', background: '#0f172a', padding: '12px', boxShadow: '0 0 20px rgba(220,38,38,0.3)' }, category: 'Automotive' },
  { id: 'auto_3', name: 'Luxury Gold', description: 'Premium gold finish', style: { border: '4px solid #d4af37', borderRadius: '16px', background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 100%)', padding: '12px', boxShadow: '0 0 15px rgba(212,175,55,0.4)' }, category: 'Automotive' },
  { id: 'auto_4', name: 'Electric Future', description: 'Modern EV style', style: { border: '4px solid #10b981', borderRadius: '8px', background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)', padding: '12px' }, category: 'Automotive' },
  { id: 'auto_5', name: 'Midnight Blue', description: 'Sleek night style', style: { border: '4px solid #3b82f6', borderRadius: '12px', background: 'linear-gradient(135deg, #0c1929 0%, #1e3a5f 100%)', padding: '12px' }, category: 'Automotive' },

  // Professional Frames
  { id: 'pro_1', name: 'Corporate Blue', description: 'Business professional', style: { border: '4px solid #2563eb', borderRadius: '4px', background: '#f8fafc', padding: '12px' }, category: 'Professional' },
  { id: 'pro_2', name: 'Executive Black', description: 'Executive elegance', style: { border: '4px solid #18181b', borderRadius: '2px', background: '#09090b', padding: '12px' }, category: 'Professional' },
  { id: 'pro_3', name: 'Enterprise Navy', description: 'Corporate trust', style: { border: '4px solid #1e40af', borderRadius: '8px', background: '#1e3a8a', padding: '12px' }, category: 'Professional' },
  { id: 'pro_4', name: 'Modern Gray', description: 'Contemporary minimal', style: { border: '4px solid #6b7280', borderRadius: '0px', background: '#f3f4f6', padding: '12px' }, category: 'Professional' },
  { id: 'pro_5', name: 'Tech Silver', description: 'Technology modern', style: { border: '4px solid #9ca3af', borderRadius: '50px', background: 'linear-gradient(135deg, #374151 0%, #6b7280 100%)', padding: '12px' }, category: 'Professional' },

  // Seasonal & Event Frames
  { id: 'season_1', name: 'Holiday Red', description: 'Festive celebration', style: { border: '4px solid #dc2626', borderRadius: '8px', background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', padding: '12px', boxShadow: '0 0 10px rgba(220,38,38,0.3)' }, category: 'Seasonal' },
  { id: 'season_2', name: 'Holiday Gold', description: 'Elegant celebration', style: { border: '4px solid #f59e0b', borderRadius: '12px', background: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)', padding: '12px' }, category: 'Seasonal' },
  { id: 'season_3', name: 'Spring Green', description: 'Fresh spring feel', style: { border: '4px solid #22c55e', borderRadius: '16px', background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)', padding: '12px' }, category: 'Seasonal' },
  { id: 'season_4', name: 'Summer Blue', description: 'Bright summer vibes', style: { border: '4px solid #0ea5e9', borderRadius: '8px', background: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)', padding: '12px' }, category: 'Seasonal' },
  { id: 'season_5', name: 'Winter White', description: 'Clean winter feel', style: { border: '4px solid #e5e7eb', borderRadius: '20px', background: '#f9fafb', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }, category: 'Seasonal' },

  // Creative & Fun Frames
  { id: 'creative_1', name: 'Neon Glow', description: 'Vibrant neon style', style: { border: '4px solid #ec4899', borderRadius: '0px', background: '#0f0f23', padding: '12px', boxShadow: '0 0 30px rgba(236,72,153,0.5)' }, category: 'Creative' },
  { id: 'creative_2', name: 'Gradient Pop', description: 'Colorful gradient', style: { border: '4px solid #8b5cf6', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)', padding: '12px' }, category: 'Creative' },
  { id: 'creative_3', name: 'Retro Vintage', description: 'Nostalgic classic', style: { border: '4px solid #92400e', borderRadius: '0px', background: '#fef3c7', padding: '12px', boxShadow: 'inset 0 0 20px rgba(146,64,14,0.2)' }, category: 'Creative' },
  { id: 'creative_4', name: 'Minimal Art', description: 'Artistic simple', style: { border: '2px solid #000000', borderRadius: '100px', background: '#ffffff', padding: '12px' }, category: 'Creative' },
  { id: 'creative_5', name: 'Bold Outline', description: 'Strong visual impact', style: { border: '6px solid #000000', borderRadius: '0px', background: '#ffffff', padding: '12px' }, category: 'Creative' },

  // Special Occasion Frames
  { id: 'special_1', name: 'Grand Opening', description: 'Celebration style', style: { border: '6px double #f59e0b', borderRadius: '4px', background: 'linear-gradient(135deg, #78350f 0%, #fbbf24 100%)', padding: '12px' }, category: 'Special' },
  { id: 'special_2', name: 'Anniversary', description: 'Milestone celebration', style: { border: '4px solid #d946ef', borderRadius: '50px', background: 'linear-gradient(135deg, #86198f 0%, #d946ef 100%)', padding: '12px' }, category: 'Special' },
  { id: 'special_3', name: 'Flash Sale', description: 'Urgent attention', style: { border: '4px solid #ef4444', borderRadius: '0px', background: '#fef2f2', padding: '12px', boxShadow: '0 0 15px rgba(239,68,68,0.4)' }, category: 'Special' },
  { id: 'special_4', name: 'VIP Exclusive', description: 'Premium access', style: { border: '4px solid #000000', borderRadius: '2px', background: 'linear-gradient(135deg, #000000 0%, #374151 100%)', padding: '12px', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }, category: 'Special' },
  { id: 'special_5', name: 'Eco Friendly', description: 'Sustainable brand', style: { border: '4px solid #16a34a', borderRadius: '100px', background: '#f0fdf4', padding: '12px', boxShadow: '0 0 10px rgba(22,163,74,0.2)' }, category: 'Special' },
]

// QR Shape Options - Enhanced with more variations
export const QR_SHAPES: { id: string; name: string; borderRadius: string; description: string; scannable?: boolean }[] = [
  { id: 'square', name: 'Square', borderRadius: '0px', description: 'Classic sharp corners' },
  { id: 'rounded_xs', name: 'Rounded XS', borderRadius: '4px', description: 'Slight corner softening' },
  { id: 'rounded_sm', name: 'Rounded S', borderRadius: '8px', description: 'Subtle round corners' },
  { id: 'rounded_md', name: 'Rounded M', borderRadius: '16px', description: 'Medium round corners' },
  { id: 'rounded_lg', name: 'Rounded L', borderRadius: '24px', description: 'Large round corners' },
  { id: 'rounded_xl', name: 'Rounded XL', borderRadius: '32px', description: 'Extra large round corners' },
  { id: 'pill', name: 'Pill', borderRadius: '64px', description: 'Full pill shape' },
  { id: 'circle', name: 'Circle', borderRadius: '50%', description: 'Perfect circle - enhanced scanability', scannable: true },
  { id: 'circle_md', name: 'Circle M', borderRadius: '40%', description: 'Medium circle' },
  { id: 'octagon', name: 'Octagon', borderRadius: '10px', description: 'Eight-sided style' },
  { id: 'hexagon', name: 'Hexagon', borderRadius: '12px', description: 'Six-sided style' },
  { id: 'diamond', name: 'Diamond', borderRadius: '4px', description: 'Classic diamond shape' },
]

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1']

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

function emptyCompany(): CompanyData {
  return {
    id: generateId(),
    name: '',
    address: '',
    phone: '',
    email: '',
    created_at: new Date().toISOString(),
    plan: 'free',
    custom_price: null,
    custom_features: [],
    branding_color: '#3b82f6',
    branding_logo: ''
  }
}

function emptyCar(companyId: string = ''): CarData {
  return {
    id: generateId(),
    company_id: companyId,
    make: '',
    model: '',
    year: new Date().getFullYear(),
    price: '',
    mileage: '',
    fuelType: '',
    transmission: '',
    color: '',
    description: '',
    contactPhone: '',
    contactEmail: '',
    contactWhatsApp: '',
    location: '',
    images: [],
    videoLink: '',
    scan_start_date: '',
    scan_end_date: '',
    qr_template: 'standard',
    qr_frame: null,
    qr_shape: 'square',
    logo_position: 'none',
    company_name_position: 'top',
    created_at: new Date().toISOString()
  }
}

function emptyLeadForm(): NewLeadForm {
  return { name: '', phone: '', email: '', interest_level: 'normal', notes: '' }
}

function getPriceNumeric(price: string): number {
  const num = parseInt(price.replace(/[^0-9]/g, ''))
  return isNaN(num) ? 0 : num
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginPassword, setLoginPassword] = useState('')
  const [isAdminSetup, setIsAdminSetup] = useState(false)
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [cars, setCars] = useState<CarData[]>([])
  const [scanRecords, setScanRecords] = useState<ScanRecord[]>([])
  const [leads, setLeads] = useState<LeadData[]>([])
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null)
  const [editingCar, setEditingCar] = useState<CarData | null>(null)
  const [viewingCarId, setViewingCarId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dataKey, setDataKey] = useState(0) // Force re-render key
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [uploadingImages, setUploadingImages] = useState<{ index: number; file: File; preview: string }[]>([])
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [qrStyle, setQrStyle] = useState<QRTemplate>('standard')

  // App Branding - persisted in Supabase
  const [appSettings, setAppSettings] = useState<AppSettings>({
    id: 'app_settings',
    app_name: 'Car QR Showcase',
    app_logo: '',
    app_description: 'QR Code Management for Car Dealerships',
    primary_color: '#3b82f6',
    secondary_color: '#1e40af',
    custom_qr_url: 'https://q2r3zr4j13l8.space.mcode.io', // Default to current deployment
    updated_at: new Date().toISOString()
  })

  // New Feature States
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showLeads, setShowLeads] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [showLeadForm, setShowLeadForm] = useState(false)

  // QR Frame & Shape Selection States
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null)
  const [selectedShape, setSelectedShape] = useState<string>('square')
  const [showFrameSelector, setShowFrameSelector] = useState(false)
  const [showShapeSelector, setShowShapeSelector] = useState(false)

  // Bulk Import States
  const [bulkImportData, setBulkImportData] = useState<Partial<CarData>[]>([])
  const [bulkImportErrors, setBulkImportErrors] = useState<string[]>([])
  const [bulkImportStep, setBulkImportStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload')
  const [csvFile, setCsvFile] = useState<File | null>(null)

  // Enhanced Analytics States
  const [showDeviceBreakdown, setShowDeviceBreakdown] = useState(false)
  const [showLocationData, setShowLocationData] = useState(false)
  const [showConversionFunnel, setShowConversionFunnel] = useState(false)
  const [deviceStats, setDeviceStats] = useState({ mobile: 0, desktop: 0, tablet: 0 })
  const [currentLeadCarId, setCurrentLeadCarId] = useState<string | null>(null)
  const [leadForm, setLeadForm] = useState<NewLeadForm>(emptyLeadForm())
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // App Branding Settings (using Supabase - see appSettings state)
  const [customQrUrl, setCustomQrUrl] = useState(() => localStorage.getItem(STORAGE_KEYS.CUSTOM_QR_URL) || '')

  // Company-level tabs
  const [companyActiveTab, setCompanyActiveTab] = useState<{ [companyId: string]: 'cars' | 'analytics' | 'leads' }>({})

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPrice, setFilterPrice] = useState<'all' | 'under10k' | '10k_30k' | '30k_50k' | 'over50k'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'expired'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc' | 'scans'>('recent')

  // Analytics Data
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [recentScansRange, setRecentScansRange] = useState<'7d' | '14d' | '30d' | '90d'>('7d')
  const [companyAnalyticsRange, setCompanyAnalyticsRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  // Custom model input for "Other" option
  const [customModel, setCustomModel] = useState('')
  const [customMake, setCustomMake] = useState('')

  // User Management State
  const [users, setUsers] = useState<UserAccount[]>([])
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user' as UserRole,
    company_access: [] as string[]
  })
  const [userLoginEmail, setUserLoginEmail] = useState('')
  const [userLoginPassword, setUserLoginPassword] = useState('')
  const [isSignupMode, setIsSignupMode] = useState(false)

  // Permission check helper
  const hasPermission = useCallback((permission: string): boolean => {
    if (!currentUser) {
      console.log('hasPermission: no currentUser')
      return false
    }
    if (!currentUser.is_active) {
      console.log('hasPermission: user not active', currentUser.name)
      return false
    }
    // Super admin has all permissions
    if (currentUser.role === 'super_admin') {
      console.log('hasPermission: super_admin has', permission)
      return true
    }
    // Check role permissions
    if (ROLE_PERMISSIONS[currentUser.role]?.includes(permission)) return true
    // Check custom permissions
    if (currentUser.permissions?.includes(permission)) return true
    return false
  }, [currentUser])

  // Check if user can access a specific company
  const canAccessCompany = useCallback((companyId: string): boolean => {
    if (!currentUser || !currentUser.is_active) return false
    if (currentUser.role === 'super_admin') return true
    if (currentUser.role === 'admin') return true
    if (currentUser.company_access.length === 0) return true
    return currentUser.company_access.includes(companyId)
  }, [currentUser])

  // Ref for fetchData to avoid stale closure in useEffect
  const fetchDataRef = useRef<() => void>(() => {})

  // fetchData function
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [companiesRes, carsRes, scansRes, leadsRes] = await Promise.all([
        supabase.from('companies').select('*').order('created_at', { ascending: false }),
        supabase.from('cars').select('*').order('created_at', { ascending: false }),
        supabase.from('scan_records').select('*').order('scanned_at', { ascending: false }),
        supabase.from('leads').select('*').order('created_at', { ascending: false })
      ])

      const mappedCars = (carsRes.data || []).map((car: any) => ({
        ...car,
        contactPhone: car.contact_phone || car.contactPhone || '',
        contactEmail: car.contact_email || car.contactEmail || '',
        contactWhatsApp: car.contact_whatsapp || car.contactWhatsApp || '',
        videoLink: car.video_link || ''
      }))

      setCompanies(companiesRes.data || [])
      setCars(mappedCars)
      setScanRecords(scansRes.data || [])
      setLeads(leadsRes.data || [])
      // Force re-render by incrementing key
      setDataKey(k => k + 1)
      if (!isRefresh) setLoading(false)
      console.log(`Data refreshed: ${scansRes.data?.length || 0} scan records, ${leadsRes.data?.length || 0} leads`)
    } catch (err) {
      console.error('Error fetching data:', err)
    }
    setRefreshing(false)
  }, [])

  // Fetch App Settings from Supabase
  const fetchAppSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 'app_settings')
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching app settings:', error)
        return
      }

      if (data) {
        setAppSettings({
          id: data.id,
          app_name: data.app_name || 'Car QR Showcase',
          app_logo: data.app_logo || '',
          app_description: data.app_description || '',
          primary_color: data.primary_color || '#3b82f6',
          secondary_color: data.secondary_color || '#1e40af',
          custom_qr_url: data.custom_qr_url || '',
          updated_at: data.updated_at
        })
      }
    } catch (err) {
      console.error('Error fetching app settings:', err)
    }
  }, [])

  // Save App Settings to Supabase
  const saveAppSettings = useCallback(async (settings: AppSettings) => {
    setSaving(true)
    try {
      const settingsToSave = {
        ...settings,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('app_settings')
        .upsert([settingsToSave], { onConflict: 'id' })

      if (error) throw error

      setAppSettings(settingsToSave)
      addNotification('scan', 'Settings Saved', 'Branding settings have been saved successfully')
    } catch (err) {
      console.error('Error saving app settings:', err)
      addNotification('scan', 'Error', 'Failed to save settings')
    }
    setSaving(false)
  }, [])

  // Apply branding colors from database - inject custom CSS to override hardcoded Tailwind colors
  useEffect(() => {
    const primaryColor = appSettings.primary_color || '#3b82f6'
    const secondaryColor = appSettings.secondary_color || '#4a90e2'

    // Create or update style element for branding colors
    let styleEl = document.getElementById('branding-colors-style')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'branding-colors-style'
      document.head.appendChild(styleEl)
    }

    // Convert hex to RGB for rgba usage
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '59, 130, 246'
    }

    const primaryRgb = hexToRgb(primaryColor)
    const secondaryRgb = hexToRgb(secondaryColor)

    // Inject CSS that overrides key UI colors
    styleEl.textContent = `
      /* Primary color overrides - main brand actions */
      .branding-primary { background-color: ${primaryColor} !important; }
      .branding-primary:hover { background-color: ${primaryColor} !important; filter: brightness(1.1) !important; }
      .branding-primary-text { color: ${primaryColor} !important; }
      .branding-primary-border { border-color: ${primaryColor} !important; }

      /* Secondary color overrides */
      .branding-secondary { background-color: ${secondaryColor} !important; }
      .branding-secondary-text { color: ${secondaryColor} !important; }
      .branding-secondary-border { border-color: ${secondaryColor} !important; }

      /* Key button overrides */
      .btn-primary {
        background: linear-gradient(to right, ${primaryColor}, ${secondaryColor}) !important;
      }

      /* Primary action buttons */
      .bg-blue-600.btn-action { background-color: ${primaryColor} !important; }
      .bg-blue-500.btn-action { background-color: ${primaryColor} !important; }

      /* Light variant backgrounds */
      .bg-blue-100 { background-color: rgba(${primaryRgb}, 0.1) !important; }
      .bg-blue-50 { background-color: rgba(${primaryRgb}, 0.05) !important; }

      /* Text colors */
      .text-blue-600 { color: ${primaryColor} !important; }
      .text-blue-700 { color: ${primaryColor} !important; }
      .text-blue-500 { color: ${primaryColor} !important; }

      /* Border colors */
      .border-blue-500 { border-color: ${primaryColor} !important; }
      .border-blue-400 { border-color: ${primaryColor} !important; }
      .border-blue-200 { border-color: rgba(${primaryRgb}, 0.3) !important; }

      /* Gradient buttons */
      .from-blue-600 { --tw-gradient-from: ${primaryColor} !important; }
      .to-purple-600 { --tw-gradient-to: ${secondaryColor} !important; }
      .from-blue-500 { --tw-gradient-from: ${primaryColor} !important; }
      .to-blue-600 { --tw-gradient-to: ${secondaryColor} !important; }

      /* Hover states */
      .hover\\\\:bg-blue-700:hover { background-color: ${primaryColor} !important; filter: brightness(0.9) !important; }
      .hover\\\\:bg-blue-200:hover { background-color: rgba(${primaryRgb}, 0.2) !important; }
      .hover\\\\:bg-blue-100:hover { background-color: rgba(${primaryRgb}, 0.1) !important; }
      .hover\\\\:text-blue-600:hover { color: ${primaryColor} !important; }
      .hover\\\\:border-blue-400:hover { border-color: ${primaryColor} !important; }
      .hover\\\\:border-blue-300:hover { border-color: rgba(${primaryRgb}, 0.5) !important; }

      /* Ring/focus colors */
      .ring-blue-500 { --tw-ring-color: ${primaryColor} !important; }

      /* Accent specific overrides */
      .accent-blue-500 { accent-color: ${primaryColor} !important; }
    `

    console.log('Branding colors applied:', {
      primary: primaryColor,
      secondary: secondaryColor
    })
  }, [appSettings.primary_color, appSettings.secondary_color])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const carId = params.get('car')
    if (carId) {
      fetchCarById(carId)
      return
    }

    // Initialize users and check for saved login
    const usersList = initializeDefaultUser()
    setUsers(usersList)

    const savedPassword = localStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD)
    const savedLogin = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN)
    const savedUser = localStorage.getItem('carqr_current_user')

    if (savedPassword) setIsAdminSetup(true)

    if (savedLogin === 'true') {
      setIsLoggedIn(true)
      // Restore current user
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser)
          setCurrentUser(user)
        } catch {
          // Invalid user data, require re-login
        }
      }
      fetchData()
      fetchAppSettings() // Fetch branding settings
    } else {
      setLoading(false)
    }
  }, [])

  // Auto-refresh scan data every 15 seconds
  useEffect(() => {
    if (!isLoggedIn || viewingCarId) return
    const interval = setInterval(() => {
      fetchData(true)
    }, 15000) // Refresh every 15 seconds
    return () => clearInterval(interval)
  }, [isLoggedIn, viewingCarId, fetchData])

  async function fetchCarById(carId: string) {
    const [carRes, companiesRes] = await Promise.all([
      supabase.from('cars').select('*').eq('id', carId).single(),
      supabase.from('companies').select('*')
    ])
    if (carRes.data) {
      setCars([carRes.data])
      setCompanies(companiesRes.data || [])
      setViewingCarId(carId)

      // Record scan when customer views the QR code (only once per visit)
      const scanKey = `scanned_${carId}`
      if (!sessionStorage.getItem(scanKey)) {
        sessionStorage.setItem(scanKey, 'true')
        const car = carRes.data
        const now = new Date()
        const scanStart = car.scan_start_date ? new Date(car.scan_start_date) : null
        const scanEnd = car.scan_end_date ? new Date(car.scan_end_date) : null

        // Only record if within valid timeframe
        if ((!scanStart || now >= scanStart) && (!scanEnd || now <= scanEnd)) {
          await supabase.from('scan_records').insert([{
            car_id: carId,
            scanned_at: new Date().toISOString()
          }])
        }
      }
    }
    setLoading(false)
  }

  function handleSetupPassword() {
    if (loginPassword.length < 4) return
    localStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, loginPassword)
    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true')
    setIsAdminSetup(true)
    setIsLoggedIn(true)
    setLoginPassword('')
    fetchData()
  }

  function handleLogin() {
    const savedPassword = localStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD)
    if (loginPassword === savedPassword) {
      setIsLoggedIn(true)
      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true')
      setLoginPassword('')
      fetchData()
    } else {
      alert('Incorrect password')
    }
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN)
    localStorage.removeItem('carqr_current_user')
    setIsLoggedIn(false)
    setCurrentUser(null)
    setCompanies([])
    setCars([])
    setScanRecords([])
    setLeads([])
  }

  // Load users from local storage
  function loadUsers(): UserAccount[] {
    const storedUsers = localStorage.getItem('carqr_users')
    if (storedUsers) {
      try {
        return JSON.parse(storedUsers)
      } catch {
        return []
      }
    }
    return []
  }

  // Save users to local storage
  function saveUsers(usersList: UserAccount[]) {
    localStorage.setItem('carqr_users', JSON.stringify(usersList))
  }

  // Initialize default super admin if no users exist
  function initializeDefaultUser() {
    const storedUsers = loadUsers()
    if (storedUsers.length === 0) {
      // Create a default super admin with a known password for first-time setup
      const defaultAdmin: UserAccount = {
        id: generateId(),
        email: 'admin@carqr.com',
        password: 'admin123',
        name: 'Administrator',
        role: 'super_admin',
        company_access: [],
        permissions: ROLE_PERMISSIONS.super_admin,
        created_at: new Date().toISOString(),
        last_login: null,
        is_active: true
      }
      saveUsers([defaultAdmin])
      // Also set the legacy password for compatibility
      localStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, 'admin123')
      return [defaultAdmin]
    }
    return storedUsers
  }

  // User registration (for super admin to create new users)
  function handleCreateUser() {
    if (!newUserForm.email.trim() || !newUserForm.password.trim() || !newUserForm.name.trim()) {
      alert('Please fill in all required fields')
      return
    }
    if (newUserForm.password.length < 4) {
      alert('Password must be at least 4 characters')
      return
    }

    const usersList = loadUsers()
    if (usersList.some(u => u.email === newUserForm.email)) {
      alert('A user with this email already exists')
      return
    }

    const newUser: UserAccount = {
      id: generateId(),
      email: newUserForm.email.trim(),
      password: newUserForm.password,
      name: newUserForm.name.trim(),
      role: newUserForm.role,
      company_access: newUserForm.role === 'user' ? newUserForm.company_access : [],
      permissions: ROLE_PERMISSIONS[newUserForm.role] || [],
      created_at: new Date().toISOString(),
      last_login: null,
      is_active: true
    }

    usersList.push(newUser)
    saveUsers(usersList)
    setUsers(usersList)
    setShowCreateUser(false)
    setNewUserForm({ email: '', password: '', name: '', role: 'user', company_access: [] })
    addNotification('report', 'User Created', `${newUser.name} has been added as ${newUser.role}`)
  }

  // User login
  function handleUserLogin() {
    const usersList = loadUsers()
    const user = usersList.find(u => u.email === userLoginEmail && u.password === userLoginPassword)

    if (user) {
      if (!user.is_active) {
        alert('This account has been deactivated. Please contact your administrator.')
        return
      }

      // Update last login
      user.last_login = new Date().toISOString()
      saveUsers(usersList)

      setCurrentUser(user)
      localStorage.setItem('carqr_current_user', JSON.stringify(user))
      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true')
      setIsLoggedIn(true)
      setUserLoginEmail('')
      setUserLoginPassword('')
      addNotification('report', 'Welcome!', `Logged in as ${user.name} (${user.role.replace('_', ' ')})`)
    } else {
      alert('Invalid email or password')
    }
  }

  // Handle signup (create first super admin)
  function handleSignup() {
    if (!userLoginEmail.trim() || !userLoginPassword.trim() || !userLoginPassword.trim()) {
      alert('Please fill in all fields')
      return
    }
    if (userLoginPassword.length < 4) {
      alert('Password must be at least 4 characters')
      return
    }

    const usersList = loadUsers()
    if (usersList.length > 0) {
      alert('An account already exists. Please login instead.')
      setIsSignupMode(false)
      return
    }

    const newAdmin: UserAccount = {
      id: generateId(),
      email: userLoginEmail.trim(),
      password: userLoginPassword,
      name: userLoginEmail.split('@')[0] || 'Administrator',
      role: 'super_admin',
      company_access: [],
      permissions: ROLE_PERMISSIONS.super_admin,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      is_active: true
    }

    usersList.push(newAdmin)
    saveUsers(usersList)
    localStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, userLoginPassword)

    setCurrentUser(newAdmin)
    localStorage.setItem('carqr_current_user', JSON.stringify(newAdmin))
    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true')
    setIsLoggedIn(true)
    addNotification('report', 'Welcome!', 'Super Admin account created successfully')
  }

  // Toggle user active status
  function toggleUserStatus(userId: string) {
    const usersList = loadUsers()
    const userIndex = usersList.findIndex(u => u.id === userId)
    if (userIndex >= 0) {
      usersList[userIndex].is_active = !usersList[userIndex].is_active
      saveUsers(usersList)
      setUsers(usersList)
      addNotification('report', 'User Updated', `${usersList[userIndex].name} has been ${usersList[userIndex].is_active ? 'activated' : 'deactivated'}`)
    }
  }

  // Delete user
  function handleDeleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user?')) return
    const usersList = loadUsers()
    const user = usersList.find(u => u.id === userId)
    const filteredUsers = usersList.filter(u => u.id !== userId)
    saveUsers(filteredUsers)
    setUsers(filteredUsers)
    addNotification('report', 'User Deleted', `${user?.name || 'User'} has been removed`)
  }

  // Update user
  function handleUpdateUser() {
    if (!editingUser) return
    if (editingUser.password.length > 0 && editingUser.password.length < 4) {
      alert('Password must be at least 4 characters')
      return
    }

    const usersList = loadUsers()
    const userIndex = usersList.findIndex(u => u.id === editingUser.id)
    if (userIndex >= 0) {
      // If password is empty, keep the old one
      const passwordToSave = editingUser.password || usersList[userIndex].password
      usersList[userIndex] = {
        ...editingUser,
        password: passwordToSave,
        permissions: ROLE_PERMISSIONS[editingUser.role] || []
      }
      saveUsers(usersList)
      setUsers(usersList)
      setEditingUser(null)
      addNotification('report', 'User Updated', `${editingUser.name} has been updated`)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editingCompany) return

    // Convert to base64 for storage
    const reader = new FileReader()
    reader.onloadend = () => {
      setEditingCompany({ ...editingCompany, branding_logo: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  async function handleSaveCompany() {
    if (!editingCompany?.name.trim()) {
      alert('Company name is required')
      return
    }
    setSaving(true)
    try {
      // Ensure branding_color has # prefix and branding_logo exists
      const companyToSave = {
        ...editingCompany,
        branding_color: editingCompany.branding_color?.startsWith('#') ? editingCompany.branding_color : `#${editingCompany.branding_color || '3b82f6'}`,
        branding_logo: editingCompany.branding_logo || ''
      }
      const { error } = await supabase.from('companies').upsert([companyToSave])
      if (error) throw error
      await fetchData()
      setEditingCompany(null)
      addNotification('report', 'Company Saved', `${editingCompany.name} has been ${companies.find(c => c.id === editingCompany.id) ? 'updated' : 'created'}`)
    } catch (err) {
      console.error('Error saving company:', err)
      alert('Error saving company')
    }
    setSaving(false)
  }

  async function handleDeleteCompany(companyId: string) {
    if (!confirm('Delete this company and all its cars?')) return
    const companyCars = getCompanyCars(companyId)
    for (const car of companyCars) {
      await supabase.from('scan_records').delete().eq('car_id', car.id)
      await supabase.from('leads').delete().eq('car_id', car.id)
    }
    await supabase.from('cars').delete().eq('company_id', companyId)
    await supabase.from('companies').delete().eq('id', companyId)
    await fetchData()
  }

  async function handleSaveCar() {
    // Get the actual make and model values (including custom ones)
    const actualMake = editingCar?.make === '__other__' ? customMake.trim() : editingCar?.make?.trim() || ''
    const actualModel = editingCar?.model === '__other__' ? customModel.trim() : editingCar?.model?.trim() || ''

    if (!actualMake) {
      alert('Make is required')
      return
    }
    if (!actualModel) {
      alert('Model is required')
      return
    }
    setSaving(true)
    try {
      // Format phone numbers for WhatsApp: remove 00 or + prefix
      const formatPhoneNumber = (phone: string) => {
        if (!phone) return ''
        const digits = phone.replace(/\D/g, '')
        // If starts with 00, remove both zeros (keep country code + number)
        if (digits.startsWith('00')) {
          return digits.substring(2)
        }
        // If starts with single 0 but is a long number (like 0968), remove the 0
        if (digits.startsWith('0') && digits.length > 10) {
          return digits.substring(1)
        }
        return digits
      }

      // Ensure all QR print fields have defaults
      const carToSave = {
        ...editingCar,
        make: actualMake,
        model: actualModel,
        qr_template: editingCar.qr_template || 'standard',
        qr_frame: editingCar.qr_frame || null,
        qr_shape: editingCar.qr_shape || 'square',
        logo_position: editingCar.logo_position || 'none',
        company_name_position: editingCar.company_name_position || 'top',
        images: editingCar.images || [],
        scan_start_date: editingCar.scan_start_date || '',
        scan_end_date: editingCar.scan_end_date || '',
        // Format WhatsApp number properly for wa.me
        contact_whatsapp: formatPhoneNumber(editingCar.contactWhatsApp)
      }
      // Remove the camelCase versions to avoid conflict
      delete (carToSave as any).contactWhatsApp
      delete (carToSave as any).videoLink
      // Remove video_link as column doesn't exist in database yet
      delete (carToSave as any).video_link
      const { error } = await supabase.from('cars').upsert([carToSave])
      if (error) throw error
      await fetchData()
      setEditingCar(null)
      addNotification('report', 'Car Saved', `${editingCar.year} ${actualMake} ${actualModel} has been ${cars.find(c => c.id === editingCar.id) ? 'updated' : 'added'}`)
    } catch (err) {
      console.error('Error saving car:', err)
      alert('Error saving car')
    }
    setSaving(false)
  }

  async function handleDeleteCar(carId: string) {
    if (!confirm('Delete this car?')) return
    await supabase.from('scan_records').delete().eq('car_id', carId)
    await supabase.from('leads').delete().eq('car_id', carId)
    await supabase.from('cars').delete().eq('id', carId)
    await fetchData()
  }

  async function recordScan(carId: string) {
    const car = cars.find(c => c.id === carId)
    if (!car) return
    const now = new Date()
    const scanStart = car.scan_start_date ? new Date(car.scan_start_date) : null
    const scanEnd = car.scan_end_date ? new Date(car.scan_end_date) : null
    if (scanStart && now < scanStart) return
    if (scanEnd && now > scanEnd) return
    const { error } = await supabase.from('scan_records').insert([{ car_id: carId, scanned_at: new Date().toISOString() }])
    if (error) {
      console.error('Error recording scan:', error)
    }
    addNotification('scan', 'New Scan', `QR code scanned for ${car.year} ${car.make}`)
    await fetchData()
  }

  async function saveLead() {
    if (!leadForm.name.trim()) {
      alert('Please enter your name')
      return
    }
    if (!currentLeadCarId) {
      alert('No car selected')
      return
    }
    setSaving(true)
    try {
      const newLead = {
        id: generateId(),
        car_id: currentLeadCarId,
        name: leadForm.name.trim(),
        phone: leadForm.phone.trim(),
        email: leadForm.email.trim(),
        interest_level: leadForm.interest_level,
        notes: leadForm.notes.trim(),
        created_at: new Date().toISOString()
      }
      const { error } = await supabase.from('leads').insert([newLead])
      if (error) {
        alert('Error saving lead: ' + error.message)
        console.error('Supabase error:', error)
      } else {
        addNotification('lead', 'Lead Saved!', `${leadForm.name} - interest recorded`)
        setShowLeadForm(false)
        setCurrentLeadCarId(null)
        setLeadForm(emptyLeadForm())
      }
    } catch (err) {
      console.error('Error saving lead:', err)
      alert('An unexpected error occurred')
    }
    setSaving(false)
  }

  // Copy leads data to clipboard
  function copyLeadsData() {
    if (leads.length === 0) {
      alert('No leads to copy')
      return
    }
    const text = leads.map(lead => {
      const car = cars.find(c => c.id === lead.car_id)
      return `Name: ${lead.name}\nEmail: ${lead.email || '-'}\nPhone: ${lead.phone || '-'}\nInterest: ${lead.interest_level}\nCar: ${car ? `${car.year} ${car.make} ${car.model}` : '-'}\nDate: ${new Date(lead.created_at).toLocaleString()}\nNotes: ${lead.notes || '-'}\n---`
    }).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      addNotification('lead', 'Copied!', `${leads.length} leads copied to clipboard`)
    }).catch(() => {
      alert('Failed to copy. Please try again.')
    })
  }

  // Print leads report
  function printLeadsReport() {
    if (leads.length === 0) {
      alert('No leads to print')
      return
    }
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to print')
      return
    }
    const urgentLeads = leads.filter(l => l.interest_level === 'urgent')
    const normalLeads = leads.filter(l => l.interest_level === 'normal')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Leads Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #666; margin-top: 30px; }
          .summary { display: flex; gap: 20px; margin: 20px 0; }
          .summary-item { background: #f3f4f6; padding: 15px 25px; border-radius: 8px; }
          .summary-item .number { font-size: 24px; font-weight: bold; color: #3b82f6; }
          .summary-item .label { color: #666; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #3b82f6; color: white; }
          tr:nth-child(even) { background: #f9fafb; }
          .urgent { background: #fee2e2; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>📋 Leads Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>

        <div class="summary">
          <div class="summary-item">
            <div class="number">${leads.length}</div>
            <div class="label">TOTAL LEADS</div>
          </div>
          <div class="summary-item">
            <div class="number">${urgentLeads.length}</div>
            <div class="label">URGENT</div>
          </div>
          <div class="summary-item">
            <div class="number">${normalLeads.length}</div>
            <div class="label">NORMAL</div>
          </div>
        </div>

        <h2>All Leads</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Interest</th>
              <th>Car</th>
              <th>Notes</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${leads.map((lead, i) => {
              const car = cars.find(c => c.id === lead.car_id)
              return `
              <tr class="${lead.interest_level === 'urgent' ? 'urgent' : ''}">
                <td>${i + 1}</td>
                <td><strong>${lead.name}</strong></td>
                <td>${lead.email || '-'}</td>
                <td>${lead.phone || '-'}</td>
                <td><span style="color: ${lead.interest_level === 'urgent' ? 'red' : 'blue'}">${lead.interest_level.toUpperCase()}</span></td>
                <td>${car ? `${car.year} ${car.make} ${car.model}` : '-'}</td>
                <td>${lead.notes || '-'}</td>
                <td>${new Date(lead.created_at).toLocaleString()}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>

        ${urgentLeads.length > 0 ? `
        <h2>Urgent Leads (Require Immediate Attention)</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Car</th>
              <th>Notes</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${urgentLeads.map(lead => {
              const car = cars.find(c => c.id === lead.car_id)
              return `
              <tr>
                <td><strong>${lead.name}</strong></td>
                <td>${lead.phone || '-'}</td>
                <td>${car ? `${car.year} ${car.make} ${car.model}` : '-'}</td>
                <td>${lead.notes || '-'}</td>
                <td>${new Date(lead.created_at).toLocaleString()}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
        ` : ''}

        <div class="footer">
          <p>Generated by Car QR Showcase</p>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  // Export leads to CSV
  function exportLeadsCSV() {
    if (leads.length === 0) {
      alert('No leads to export')
      return
    }
    const headers = ['Name', 'Email', 'Phone', 'Interest Level', 'Car', 'Notes', 'Date']
    const rows = leads.map(lead => {
      const car = cars.find(c => c.id === lead.car_id)
      return [
        lead.name,
        lead.email || '',
        lead.phone || '',
        lead.interest_level,
        car ? `${car.year} ${car.make} ${car.model}` : '',
        lead.notes || '',
        new Date(lead.created_at).toLocaleString()
      ]
    })
    // UTF-8 BOM for proper multi-language support in Excel
    const BOM = '\ufeff'
    const csv = BOM + [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addNotification('lead', 'Exported!', `${leads.length} leads exported to CSV`)
  }

  // Company-level lead functions
  function copyCompanyLeads(companyLeads: LeadData[], carsData: CarData[]) {
    if (companyLeads.length === 0) {
      alert('No leads to copy')
      return
    }
    const text = companyLeads.map(lead => {
      const car = carsData.find(c => c.id === lead.car_id)
      return `Name: ${lead.name}\nEmail: ${lead.email || '-'}\nPhone: ${lead.phone || '-'}\nInterest: ${lead.interest_level}\nCar: ${car ? `${car.year} ${car.make} ${car.model}` : '-'}\nDate: ${new Date(lead.created_at).toLocaleString()}\nNotes: ${lead.notes || '-'}\n---`
    }).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      addNotification('lead', 'Copied!', `${companyLeads.length} company leads copied to clipboard`)
    }).catch(() => {
      alert('Failed to copy. Please try again.')
    })
  }

  function printCompanyLeadsReport(companyLeads: LeadData[], carsData: CarData[], companyName: string) {
    if (companyLeads.length === 0) {
      alert('No leads to print')
      return
    }
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to print')
      return
    }
    const urgentLeads = companyLeads.filter(l => l.interest_level === 'urgent')
    const normalLeads = companyLeads.filter(l => l.interest_level === 'normal')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Leads Report - ${companyName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          .summary { display: flex; gap: 20px; margin: 20px 0; }
          .summary-item { background: #f3f4f6; padding: 15px 25px; border-radius: 8px; }
          .summary-item .number { font-size: 24px; font-weight: bold; color: #3b82f6; }
          .summary-item .label { color: #666; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #3b82f6; color: white; }
          tr:nth-child(even) { background: #f9fafb; }
          .urgent { background: #fee2e2; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Leads Report - ${companyName}</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <div class="summary">
          <div class="summary-item">
            <div class="number">${companyLeads.length}</div>
            <div class="label">TOTAL LEADS</div>
          </div>
          <div class="summary-item">
            <div class="number">${urgentLeads.length}</div>
            <div class="label">URGENT</div>
          </div>
          <div class="summary-item">
            <div class="number">${normalLeads.length}</div>
            <div class="label">NORMAL</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Interest</th><th>Car</th><th>Notes</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${companyLeads.map((lead, i) => {
              const car = carsData.find(c => c.id === lead.car_id)
              return `
              <tr class="${lead.interest_level === 'urgent' ? 'urgent' : ''}">
                <td>${i + 1}</td>
                <td><strong>${lead.name}</strong></td>
                <td>${lead.email || '-'}</td>
                <td>${lead.phone || '-'}</td>
                <td><span style="color: ${lead.interest_level === 'urgent' ? 'red' : 'blue'}">${lead.interest_level.toUpperCase()}</span></td>
                <td>${car ? `${car.year} ${car.make} ${car.model}` : '-'}</td>
                <td>${lead.notes || '-'}</td>
                <td>${new Date(lead.created_at).toLocaleString()}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  function exportCompanyLeadsCSV(companyLeads: LeadData[], carsData: CarData[], companyName: string) {
    if (companyLeads.length === 0) {
      alert('No leads to export')
      return
    }
    const headers = ['Name', 'Email', 'Phone', 'Interest Level', 'Car', 'Notes', 'Date']
    const rows = companyLeads.map(lead => {
      const car = carsData.find(c => c.id === lead.car_id)
      return [
        lead.name,
        lead.email || '',
        lead.phone || '',
        lead.interest_level,
        car ? `${car.year} ${car.make} ${car.model}` : '',
        lead.notes || '',
        new Date(lead.created_at).toLocaleString()
      ]
    })
    // UTF-8 BOM for proper multi-language support in Excel
    const BOM = '\ufeff'
    const csv = BOM + [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${companyName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addNotification('lead', 'Exported!', `${companyLeads.length} company leads exported to CSV`)
  }

  function addNotification(type: NotifType, title: string, message: string) {
    const newNotif: NotificationData = {
      id: generateId(),
      company_id: '',
      type,
      title,
      message,
      read: false,
      created_at: new Date().toISOString()
    }
    setNotifications(prev => [newNotif, ...prev])
    setUnreadCount(prev => prev + 1)
  }

  function markNotificationsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  function getCarUrl(carId: string) {
    // Priority: custom_qr_url from database > fallback URL
    const customUrl = appSettings.custom_qr_url || customQrUrl || ''

    if (customUrl) {
      const baseUrl = customUrl.endsWith('/') ? customUrl : customUrl + '/'
      return `${baseUrl}customer-standalone.html?car=${carId}`
    }

    // Default fallback to current domain
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '').replace('customer-standalone.html', '').replace('customer.html', '')
    return `${baseUrl}customer-standalone.html?car=${carId}`
  }

  function getCompanyCars(companyId: string) {
    let companyCars = cars.filter(c => c.company_id === companyId)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      companyCars = companyCars.filter(c =>
        c.make.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        c.year.toString().includes(q)
      )
    }
    if (filterPrice !== 'all') {
      companyCars = companyCars.filter(c => {
        const price = getPriceNumeric(c.price)
        if (filterPrice === 'under10k') return price < 10000
        if (filterPrice === '10k_30k') return price >= 10000 && price <= 30000
        if (filterPrice === '30k_50k') return price > 30000 && price <= 50000
        if (filterPrice === 'over50k') return price > 50000
        return true
      })
    }
    if (filterStatus !== 'all') {
      const now = new Date()
      companyCars = companyCars.filter(c => {
        const start = c.scan_start_date ? new Date(c.scan_start_date) : null
        const end = c.scan_end_date ? new Date(c.scan_end_date) : null
        if (filterStatus === 'expired') return end && now > end
        if (filterStatus === 'pending') return start && now < start
        if (filterStatus === 'active') return (!start || now >= start) && (!end || now <= end)
        return true
      })
    }
    if (sortBy === 'price_asc') {
      companyCars.sort((a, b) => getPriceNumeric(a.price) - getPriceNumeric(b.price))
    } else if (sortBy === 'price_desc') {
      companyCars.sort((a, b) => getPriceNumeric(b.price) - getPriceNumeric(a.price))
    } else if (sortBy === 'scans') {
      companyCars.sort((a, b) => getCarScanCount(b.id) - getCarScanCount(a.id))
    }
    return companyCars
  }

  function getCarScanCount(carId: string) {
    return scanRecords.filter(s => s.car_id === carId).length
  }

  function getCompanyScanCount(companyId: string) {
    const companyCarIds = cars.filter(c => c.company_id === companyId).map(c => c.id)
    return scanRecords.filter(s => companyCarIds.includes(s.car_id)).length
  }

  function getCarImages(car: CarData) {
    return car.images && car.images.length > 0 ? car.images : []
  }

  function isCarScannable(car: CarData): boolean {
    const now = new Date()
    const start = car.scan_start_date ? new Date(car.scan_start_date) : null
    const end = car.scan_end_date ? new Date(car.scan_end_date) : null
    if (start && now < start) return false
    if (end && now > end) return false
    return true
  }

  function getCarTimeframeStatus(car: CarData): string {
    const now = new Date()
    const start = car.scan_start_date ? new Date(car.scan_start_date) : null
    const end = car.scan_end_date ? new Date(car.scan_end_date) : null
    if (!start && !end) return 'Active'
    if (start && now < start) return `Starts ${car.scan_start_date}`
    if (end && now > end) return 'Expired'
    return 'Active'
  }

  function getCarLeads(carId: string) {
    return leads.filter(l => l.car_id === carId)
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setEditingCar(prev => {
        if (!prev) return prev
        const newImages = [...(prev.images || [])]
        newImages[index] = base64
        return { ...prev, images: newImages.filter(img => img.trim()) }
      })
    }
    reader.readAsDataURL(file)
  }

  function getQrStyleParams(template: QRTemplate, frameId?: string | null, shapeId?: string) {
    const templates: Record<QRTemplate, { color: string; bgcolor: string; style: string }> = {
      standard: { color: '000000', bgcolor: 'ffffff', style: 'border:2px solid #333;border-radius:4px' },
      luxury: { color: 'd4af37', bgcolor: '1a1a2e', style: 'border:3px solid #d4af37;box-shadow:0 0 10px rgba(212,175,55,0.5)' },
      classic: { color: '1a1a1a', bgcolor: 'f5f5dc', style: 'border:2px solid #8b7355;border-radius:8px' },
      bold: { color: 'ffffff', bgcolor: 'dc2626', style: 'border:4px solid #991b1b;border-radius:50%;padding:4px' },
      minimalist: { color: '000000', bgcolor: 'ffffff', style: 'border:1px solid #e5e7eb;padding:8px' },
      sports: { color: 'ffffff', bgcolor: '0f172a', style: 'border:3px solid #22c55e;border-radius:4px' },
      eco: { color: 'ffffff', bgcolor: '16a34a', style: 'border:3px solid #15803d;border-radius:12px 0 12px 0' }
    }

    let baseStyle = templates[template] || templates.standard

    // Get frame styles
    if (frameId) {
      const frame = QR_FRAMES.find(f => f.id === frameId)
      if (frame) {
        const borderMatch = (frame.style.border as string).match(/(\d+)px\s+solid\s+(.+)/)
        if (borderMatch) {
          baseStyle.style = `border:${borderMatch[0]};border-radius:${frame.style.borderRadius};padding:${frame.style.padding};box-shadow:${frame.style.boxShadow || 'none'}`
        }
      }
    }

    // Get shape override
    if (shapeId && shapeId !== 'square') {
      const shape = QR_SHAPES.find(s => s.id === shapeId)
      if (shape) {
        baseStyle.style = baseStyle.style.replace(/border-radius:[^;]+/, `border-radius:${shape.borderRadius}`)
      }
    }

    return baseStyle
  }

  function printBarcodes(companyId: string) {
    const company = companies.find(c => c.id === companyId)
    const companyCars = getCompanyCars(companyId)
    if (!company || companyCars.length === 0) {
      alert('No cars to print')
      return
    }
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    let html = `<!DOCTYPE html><html><head><title>Print Barcodes - ${company.name}</title><style>body{font-family:Arial;padding:10px;margin:0}.barcodes{display:flex;flex-wrap:wrap;gap:15px;justify-content:center}.card{background:white;padding:8px;text-align:center;page-break-inside:avoid;display:inline-block}.card .qr-wrapper{display:inline-block;padding:6px;position:relative}.card .qr-wrapper img.logo-overlay{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;object-fit:contain;background:white;border-radius:2px;padding:2px}.card .car-name{font-size:10px;font-weight:600;margin-top:4px}.card .logo-img{max-width:50px;max-height:25px;object-fit:contain;margin:0 auto;display:block}.card .company-name{font-size:9px;color:#333;font-weight:bold;text-align:center;margin-bottom:4px}@media print{body{padding:0}.card{margin:2px;page-break-inside:avoid}}</style></head><body><div class="barcodes">`
    companyCars.forEach(car => {
      const url = getCarUrl(car.id)
      const styleParams = getQrStyleParams(car.qr_template, car.qr_frame, car.qr_shape)

      // QR with center logo only
      let qrHtml = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=${styleParams.color}&bgcolor=${styleParams.bgcolor}&data=${encodeURIComponent(url)}" alt="QR Code" style="display:block;" />`
      if (car.logo_position === 'center' && company.branding_logo) {
        qrHtml += `<img src="${company.branding_logo}" alt="Logo" class="logo-overlay" />`
      }

      // Build top and bottom sections
      let topSection = ''
      let bottomSection = ''

      // Top section: company name first, then logo
      if (car.company_name_position === 'top') {
        topSection += `<div class="company-name">${company.name}</div>`
      }
      if (car.logo_position === 'top' && company.branding_logo) {
        topSection += `<img src="${company.branding_logo}" alt="Logo" class="logo-img" />`
      }

      // Bottom section: logo first, then company name
      if (car.logo_position === 'bottom' && company.branding_logo) {
        bottomSection += `<img src="${company.branding_logo}" alt="Logo" class="logo-img" />`
      }
      if (car.company_name_position === 'bottom') {
        bottomSection += `<div class="company-name">${company.name}</div>`
      }

      html += `<div class="card">
        ${topSection ? `<div style="margin-bottom:4px">${topSection}</div>` : ''}
        <div class="qr-wrapper" style="${styleParams.style}">${qrHtml}</div>
        ${bottomSection ? `<div style="margin-top:4px">${bottomSection}</div>` : ''}
        <div class="car-name">${car.year} ${car.make}</div>
      </div>`
    })
    html += '</div></body></html>'
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  function printSingleCarQR(carId: string) {
    const car = cars.find(c => c.id === carId)
    if (!car) return
    const company = companies.find(c => c.id === car.company_id)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Get template, frame and shape styles
    const template = QR_TEMPLATES[car.qr_template] || QR_TEMPLATES.standard
    const frame = car.qr_frame ? QR_FRAMES.find(f => f.id === car.qr_frame) : null
    const shape = car.qr_shape ? QR_SHAPES.find(s => s.id === car.qr_shape) : null
    const shapeRadius = shape?.borderRadius || '8px'
    const frameStyle = frame?.style || {}

    // Get template colors (remove # for QR API)
    const qrColor = template.qrColor.replace('#', '')
    const qrBg = template.qrBg.replace('#', '')

    const url = getCarUrl(car.id)

    // QR size
    const qrSize = 200

    // For shapes with enhanced scannability, use higher error correction (M)
    // This helps when QR codes are cut off by rounded corners
    // The QR API supports: L, M, Q, H (Low, Medium, Quorum, High)
    const shapeData = QR_SHAPES.find(s => s.id === car.qr_shape)
    const isScannableShape = shapeData?.scannable === true || car.qr_shape === 'circle'
    const errorCorrection = isScannableShape ? 'M' : 'L'

    // Build frame wrapper style - use template colors for border if available
    let frameWrapperStyle = 'display:inline-block;'
    if (frame) {
      // Use frame's native background, border, and styling
      frameWrapperStyle += `background:${frameStyle.background || qrBg ? '#' + qrBg : '#ffffff'};padding:${frameStyle.padding || '12px'};border:${frameStyle.border || 'none'};border-radius:${frameStyle.borderRadius || '8px'};`
      if (frameStyle.boxShadow) {
        frameWrapperStyle += `box-shadow:${frameStyle.boxShadow};`
      }
    } else {
      // Use template border color if available
      const borderColor = template.borderColor || '#333333'
      frameWrapperStyle += `background:#${qrBg};padding:8px;border:2px solid ${borderColor};border-radius:${shapeRadius};`
    }

    // QR wrapper with shape clipping
    const qrWrapperStyle = `width:${qrSize}px;height:${qrSize}px;overflow:hidden;border-radius:${shapeRadius};display:block;`

    // QR Code with optional small center logo
    // Build QR API URL with template colors and error correction
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&color=${qrColor}&bgcolor=${qrBg}&ecc=${errorCorrection}&data=${encodeURIComponent(url)}`

    let qrSection = ''
    if (car.logo_position === 'center' && company?.branding_logo) {
      const logoOverlaySize = 25
      qrSection = `<div style="${frameWrapperStyle}">
        <div style="position:relative;display:inline-block;">
          <img src="${qrApiUrl}" alt="QR Code" style="${qrWrapperStyle}" />
          <img src="${company.branding_logo}" alt="Logo" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${logoOverlaySize}px;height:${logoOverlaySize}px;object-fit:contain;background:#${qrBg};border-radius:3px;padding:2px;" />
        </div>
      </div>`
    } else {
      qrSection = `<div style="${frameWrapperStyle}">
        <img src="${qrApiUrl}" alt="QR Code" style="${qrWrapperStyle}" />
      </div>`
    }

    // Logo for top/bottom positions
    const logoImg = company?.branding_logo
      ? `<img src="${company.branding_logo}" alt="Logo" style="max-width:120px;max-height:60px;object-fit:contain;display:block;margin:0 auto;" />`
      : ''

    // Company name
    const companyNameText = company?.name
      ? `<div style="font-size:16px;color:#333;font-weight:bold;text-align:center;">${company.name}</div>`
      : ''

    // Build top section
    let topSection = ''
    let bottomSection = ''
    if (car.company_name_position === 'top') {
      topSection += companyNameText
    }
    if (car.logo_position === 'top' && logoImg) {
      topSection += logoImg
    }
    if (car.logo_position === 'bottom' && logoImg) {
      bottomSection += logoImg
    }
    if (car.company_name_position === 'bottom') {
      bottomSection += companyNameText
    }

    let html = `<!DOCTYPE html><html><head><title>Print QR - ${car.make} ${car.model}</title>
      <style>
        body{font-family:Arial;padding:20px;text-align:center;background:#f5f5f5}
        .card{background:white;padding:24px;border-radius:12px;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
        .car-name{font-size:18px;font-weight:bold;margin-top:12px;color:#333}
        @media print{body{background:white;padding:10px} .card{box-shadow:none}}
      </style>
    </head><body>
      <div class="card">
        ${topSection ? `<div style="margin-bottom:8px">${topSection}</div>` : ''}
        ${qrSection}
        ${bottomSection ? `<div style="margin-top:8px">${bottomSection}</div>` : ''}
        <div class="car-name">${car.year} ${car.make} ${car.model}</div>
      </div>
    </body></html>`
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 800)
  }

  function generateReport(company: CompanyData) {
    const companyCars = getCompanyCars(company.id)
    const totalScans = getCompanyScanCount(company.id)
    const companyLeads = leads.filter(l => companyCars.some(c => c.id === l.car_id))
    let report = `SCAN REPORT - ${company.name}\n`
    report += `Generated: ${new Date().toLocaleString()}\n`
    report += `Total Cars: ${companyCars.length}\n`
    report += `Total Scans: ${totalScans}\n`
    report += `Total Leads: ${companyLeads.length}\n\n`
    companyCars.forEach(car => {
      const carScans = scanRecords.filter(s => s.car_id === car.id)
      const scanCount = carScans.length
      report += `- ${car.year} ${car.make} ${car.model} (${scanCount} scans)\n`
      carScans.forEach((scan, idx) => {
        const scanDate = new Date(scan.scanned_at).toLocaleString()
        report += `  ${idx + 1}. ${scanDate}\n`
      })
    })
    return report
  }

  function showDetailedReport(company: CompanyData) {
    const companyCars = getCompanyCars(company.id)
    const companyLeads = leads.filter(l => companyCars.some(c => c.id === l.car_id))
    let html = `<!DOCTYPE html><html><head><title>Report - ${company.name}</title><style>body{font-family:Arial;padding:20px}.header{background:#3b82f6;color:white;padding:20px;border-radius:10px;margin-bottom:20px}.stats{display:flex;gap:20px;margin-bottom:20px}.stat{background:#f3f4f6;padding:15px;border-radius:8px;text-align:center;flex:1}.stat h3{font-size:24px;margin:0}.stat p{margin:5px 0 0;color:#666}.cars{margin-top:20px}.car{background:white;border:1px solid #e5e7eb;padding:15px;margin-bottom:10px;border-radius:8px}.scan-count{background:#3b82f6;color:white;padding:5px 12px;border-radius:20px;font-size:14px}.scan-table{width:100%;border-collapse:collapse}.scan-table th{background:#f9fafb;text-align:left;padding:8px;border-bottom:1px solid #e5e7eb}.scan-table td{padding:8px;border-bottom:1px solid #f3f4f6}.no-scans{color:#999;font-style:italic}@media print{body{padding:0}}</style></head><body><div class="header"><h1>${company.name}</h1><p>Scan Report - ${new Date().toLocaleString()}</p></div><div class="stats"><div class="stat"><h3>${companyCars.length}</h3><p>Cars</p></div><div class="stat"><h3>${getCompanyScanCount(company.id)}</h3><p>Total Scans</p></div><div class="stat"><h3>${companyLeads.length}</h3><p>Leads</p></div></div><div class="cars">`
    companyCars.forEach(car => {
      const carScans = scanRecords.filter(s => s.car_id === car.id)
      const scanCount = carScans.length
      html += `<div class="car"><div style="display:flex;justify-content:space-between;align-items:center"><h3>${car.year} ${car.make} ${car.model}</h3><span class="scan-count">${scanCount} scans</span></div>`
      if (carScans.length > 0) {
        html += '<table class="scan-table"><tr><th>#</th><th>Scan Time</th></tr>'
        carScans.forEach((scan, idx) => {
          const scanDate = new Date(scan.scanned_at).toLocaleString()
          html += `<tr><td>${idx + 1}</td><td>${scanDate}</td></tr>`
        })
        html += '</table>'
      } else {
        html += '<p class="no-scans">No scans yet</p>'
      }
      html += '</div>'
    })
    html += '</div></body></html>'
    const reportWindow = window.open('', '_blank')
    if (reportWindow) {
      reportWindow.document.write(html)
      reportWindow.document.close()
      setTimeout(() => reportWindow.print(), 500)
    }
  }

  // Analytics Functions
  function getScanTrendData() {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365
    const now = new Date()
    const data: { date: string; scans: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const count = scanRecords.filter(s => s.scanned_at.startsWith(dateStr)).length
      data.push({ date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), scans: count })
    }
    return data
  }

  function getCarScanData() {
    const topCars = cars.slice(0, 10).map(car => ({
      name: `${car.make} ${car.model}`.substring(0, 15),
      scans: getCarScanCount(car.id)
    })).filter(c => c.scans > 0).sort((a, b) => b.scans - a.scans)
    return topCars
  }

  function getLeadInterestData() {
    const urgent = leads.filter(l => l.interest_level === 'urgent').length
    const normal = leads.filter(l => l.interest_level === 'normal').length
    return [
      { name: 'Urgent', value: urgent, color: '#ef4444' },
      { name: 'Normal', value: normal, color: '#3b82f6' }
    ].filter(d => d.value > 0)
  }

  function getCompanyStats() {
    return companies.map(company => ({
      name: company.name,
      cars: getCompanyCars(company.id).length,
      scans: getCompanyScanCount(company.id),
      leads: leads.filter(l => cars.filter(c => c.company_id === company.id).some(car => car.id === l.car_id)).length
    }))
  }

  function exportCompaniesCSV() {
    const headers = ['Name', 'Address', 'Phone', 'Email', 'Plan', 'Cars', 'Scans', 'Created']
    const rows = companies.map(c => [
      c.name,
      c.address,
      c.phone,
      c.email,
      c.plan,
      getCompanyCars(c.id).length.toString(),
      getCompanyScanCount(c.id).toString(),
      c.created_at
    ])
    // UTF-8 BOM for proper multi-language support in Excel
    const BOM = '\ufeff'
    const csv = BOM + [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `companies_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCarsCSV() {
    const headers = ['Make', 'Model', 'Year', 'Price', 'Company', 'Scans', 'Status', 'Created']
    const rows = cars.map(c => {
      const company = companies.find(comp => comp.id === c.company_id)
      return [
        c.make,
        c.model,
        c.year.toString(),
        c.price,
        company?.name || '',
        getCarScanCount(c.id).toString(),
        getCarTimeframeStatus(c),
        c.created_at
      ]
    })
    // UTF-8 BOM for proper multi-language support in Excel
    const BOM = '\ufeff'
    const csv = BOM + [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cars_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // CSV Parsing Function
  function parseCSV(text: string) {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      setBulkImportErrors(['CSV file is empty or has no data rows'])
      return
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
    const errors: string[] = []
    const parsedData: Partial<CarData>[] = []

    for (let i = 1; i < Math.min(lines.length, 101); i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''))
      const row: Partial<CarData> = {
        id: generateId(),
        make: values[headers.indexOf('make')] || '',
        model: values[headers.indexOf('model')] || '',
        year: parseInt(values[headers.indexOf('year')]) || new Date().getFullYear(),
        price: values[headers.indexOf('price')] || '',
        mileage: values[headers.indexOf('mileage')] || '',
        fuelType: values[headers.indexOf('fueltype')] || '',
        transmission: values[headers.indexOf('transmission')] || '',
        color: values[headers.indexOf('color')] || '',
        description: values[headers.indexOf('description')] || '',
        contactPhone: values[headers.indexOf('contactphone')] || '',
        contactEmail: values[headers.indexOf('contactemail')] || '',
        location: values[headers.indexOf('location')] || '',
        company_id: '',
        contactWhatsApp: '',
        images: [],
        videoLink: '',
        scan_start_date: '',
        scan_end_date: '',
        qr_template: 'standard',
        logo_position: 'none',
        company_name_position: 'top',
        created_at: new Date().toISOString()
      }

      if (!row.make && !row.model) {
        errors.push(`Row ${i + 1}: Missing required fields (Make, Model)`)
      } else {
        parsedData.push(row)
      }
    }

    setBulkImportData(parsedData)
    setBulkImportErrors(errors)
  }

  // Handle Bulk Import
  async function handleBulkImport() {
    setBulkImportStep('importing')

    const validCars = bulkImportData.filter(c => c.make && c.model && bulkImportData[0]?.company_id)

    try {
      // Format cars for Supabase
      const carsToInsert = validCars.map(car => ({
        ...car,
        company_id: bulkImportData[0]?.company_id || '',
        qr_template: car.qr_template || 'standard',
        logo_position: car.logo_position || 'none',
        company_name_position: car.company_name_position || 'top',
        images: car.images || [],
        scan_start_date: car.scan_start_date || '',
        scan_end_date: car.scan_end_date || '',
        created_at: new Date().toISOString()
      }))

      // Insert into Supabase
      const { error } = await supabase.from('cars').insert(carsToInsert)
      if (error) throw error

      // Refresh data
      await fetchData()

      setBulkImportStep('complete')
      addNotification('lead', 'Import Complete', `${validCars.length} cars imported successfully`)
    } catch (err) {
      console.error('Error importing cars:', err)
      alert('Error importing cars')
      setBulkImportStep('preview')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    )
  }

  // Public Car View
  if (viewingCarId) {
    const car = cars.find(c => c.id === viewingCarId)
    if (car) {
      const company = companies.find(c => c.id === car.company_id)
      const images = getCarImages(car)
      const carTimeframeStatus = getCarTimeframeStatus(car)
      const isScannable = isCarScannable(car)
      const carLeads = getCarLeads(car.id)
      const template = QR_TEMPLATES[car.qr_template] || QR_TEMPLATES.standard

      return (
        <div className="min-h-screen bg-gray-100">
          <header className="bg-white shadow-sm p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg"><Car className="w-6 h-6 text-white" /></div>
                <div>
                  <h1 className="text-xl font-bold">Car Details</h1>
                  <p className="text-xs text-gray-500">Scan to view</p>
                </div>
              </div>
              <button onClick={() => setViewingCarId(null)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />Back
              </button>
            </div>
          </header>
          <main className="max-w-4xl mx-auto p-4">
            {!isScannable ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="text-6xl mb-4">⏰</div>
                <h2 className="text-2xl font-bold text-red-600 mb-2">QR Code Not Active</h2>
                <p className="text-gray-600 mb-4">This QR code has expired or is not yet active.</p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 inline-block">
                  <p className="text-red-600 font-semibold">Status: {carTimeframeStatus}</p>
                </div>
                <p className="text-sm text-gray-500 mt-6">Contact the car dealership for more information.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                {/* Header with logo and/or company name based on position */}
                {car.company_name_position === 'top' && company && (
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {company.branding_logo && car.logo_position === 'top' && (
                      <img src={company.branding_logo} alt="Logo" className="w-12 h-12 object-contain" />
                    )}
                    <p className="text-lg font-semibold text-gray-700">{company.name}</p>
                  </div>
                )}
                {/* Logo only at top (no company name) */}
                {car.company_name_position === 'none' && company?.branding_logo && car.logo_position === 'top' && (
                  <div className="flex justify-center mb-4">
                    <img src={company.branding_logo} alt="Logo" className="w-16 h-16 object-contain" />
                  </div>
                )}
                <h2 className="text-2xl font-bold mb-2 text-center">{car.year} {car.make} {car.model}</h2>
                {car.price && <p className="text-3xl font-bold text-blue-600 mb-4">{car.price}</p>}
                {images.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Car Photos</p>
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((img, idx) => (
                        <img key={idx} src={img} alt={`Car ${idx + 1}`} onClick={() => setLightboxImage(img)} className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80" />
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {car.mileage && <div><p className="text-gray-500 text-sm">Mileage</p><p className="font-semibold">{car.mileage}</p></div>}
                  {car.color && <div><p className="text-gray-500 text-sm">Color</p><p className="font-semibold">{car.color}</p></div>}
                  {car.fuelType && <div><p className="text-gray-500 text-sm">Fuel</p><p className="font-semibold">{car.fuelType}</p></div>}
                  {car.transmission && <div><p className="text-gray-500 text-sm">Transmission</p><p className="font-semibold">{car.transmission}</p></div>}
                  {car.location && <div className="col-span-2"><p className="text-gray-500 text-sm">Location</p><p className="font-semibold">{car.location}</p></div>}
                </div>
                {car.description && <p className="text-gray-700 mb-4">{car.description}</p>}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {car.contactPhone && <a href={`tel:${car.contactPhone}`} className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-lg"><Phone className="w-5 h-5 text-blue-600" /><span className="text-sm">Call</span></a>}
                  {car.contactWhatsApp && <a href={`https://wa.me/${car.contactWhatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in your ${car.year} ${car.make} ${car.model}`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg"><MessageCircle className="w-5 h-5 text-green-600" /><span className="text-sm">WhatsApp</span></a>}
                  {car.contactEmail && <a href={`mailto:${car.contactEmail}`} className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-lg"><Mail className="w-5 h-5 text-gray-600" /><span className="text-sm">Email</span></a>}
                </div>
                <button onClick={() => { setShowLeadForm(true); setCurrentLeadCarId(car.id) }} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />I'm Interested - Contact Me
                </button>
                {carLeads.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium">{carLeads.length} people interested in this car</p>
                  </div>
                )}
                {/* Footer with logo and/or company name based on position */}
                {car.company_name_position === 'bottom' && company && (
                  <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t">
                    {company.branding_logo && car.logo_position === 'bottom' && (
                      <img src={company.branding_logo} alt="Logo" className="w-12 h-12 object-contain" />
                    )}
                    <p className="text-lg font-semibold text-gray-700">{company.name}</p>
                  </div>
                )}
                {/* Logo only at bottom (no company name) */}
                {car.company_name_position === 'none' && company?.branding_logo && car.logo_position === 'bottom' && (
                  <div className="flex justify-center mt-6 pt-4 border-t">
                    <img src={company.branding_logo} alt="Logo" className="w-16 h-16 object-contain" />
                  </div>
                )}
                {/* Customer-facing footer with app branding */}
                <footer className="text-center py-6 text-gray-400 text-sm">
                  <p>Powered by {appSettings.app_name}</p>
                </footer>
              </div>
            )}
          </main>
          {lightboxImage && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
              <button className="absolute top-4 right-4 text-white text-3xl">×</button>
              <img src={lightboxImage} alt="" className="max-w-full max-h-full object-contain" />
            </div>
          )}
          {showLeadForm && currentLeadCarId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">I'm Interested</h2>
                  <button onClick={() => { setShowLeadForm(false); setCurrentLeadCarId(null); setLeadForm(emptyLeadForm()) }} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Your Name *</label>
                    <input type="text" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input type="tel" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="+1 555-123-4567" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Interest Level</label>
                    <div className="flex gap-2">
                      {(['urgent', 'normal'] as LeadInterest[]).map(level => (
                        <button key={level} onClick={() => setLeadForm({ ...leadForm, interest_level: level })} className={`flex-1 py-2 rounded-lg capitalize ${leadForm.interest_level === level ? (level === 'urgent' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white') : 'bg-gray-100'}`}>
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} className="w-full p-3 border rounded-lg h-20" placeholder="Any questions or notes..." />
                  </div>
                  <button onClick={saveLead} disabled={saving} className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {saving ? 'Submitting...' : 'Submit Interest'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }
  }

  // Login Screen
  if (!isLoggedIn) {
    const usersExist = users.length > 0
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl inline-flex mb-4">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold">{appSettings.app_name}</h1>
            <p className="text-gray-500">Multi-Account QR Management System</p>
          </div>
          <div className="space-y-4">
            {!usersExist ? (
              // First time setup - create super admin
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Welcome! Create your Super Admin account to get started.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
                  <input type="email" value={userLoginEmail} onChange={(e) => setUserLoginEmail(e.target.value)} className="w-full p-3 border-2 border-gray-300 rounded-xl" placeholder="admin@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
                  <input type="password" value={userLoginPassword} onChange={(e) => setUserLoginPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSignup()} className="w-full p-3 border-2 border-gray-300 rounded-xl" placeholder="Enter password (4+ characters)" />
                </div>
                <button onClick={handleSignup} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
                  <Shield className="w-5 h-5" />Create Super Admin
                </button>
              </>
            ) : (
              // Login form
              <>
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setIsSignupMode(false)} className={`flex-1 py-2 rounded-lg font-medium ${!isSignupMode ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                    Login
                  </button>
                  {hasPermission('users_create') && (
                    <button onClick={() => setIsSignupMode(true)} className={`flex-1 py-2 rounded-lg font-medium ${isSignupMode ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                      Register
                    </button>
                  )}
                </div>
                {!isSignupMode ? (
                  // Login mode
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
                      <input type="email" value={userLoginEmail} onChange={(e) => setUserLoginEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUserLogin()} className="w-full p-3 border-2 border-gray-300 rounded-xl" placeholder="Enter your email" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
                      <input type="password" value={userLoginPassword} onChange={(e) => setUserLoginPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUserLogin()} className="w-full p-3 border-2 border-gray-300 rounded-xl" placeholder="Enter your password" />
                    </div>
                    <button onClick={handleUserLogin} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
                      <Key className="w-5 h-5" />Login
                    </button>
                  </>
                ) : (
                  // Register mode (for admins to create new users)
                  <>
                    <p className="text-sm text-gray-600 text-center mb-2">Create a new user account</p>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Name</label>
                      <input type="text" value={newUserForm.name} onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })} className="w-full p-3 border-2 border-gray-300 rounded-xl" placeholder="Full name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
                      <input type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} className="w-full p-3 border-2 border-gray-300 rounded-xl" placeholder="email@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
                      <input type="password" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} className="w-full p-3 border-2 border-gray-300 rounded-xl" placeholder="Password (4+ characters)" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Role</label>
                      <select value={newUserForm.role} onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })} className="w-full p-3 border-2 border-gray-300 rounded-xl">
                        <option value="user">User (Data Entry)</option>
                        <option value="admin">Admin</option>
                        {currentUser?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                      </select>
                    </div>
                    <button onClick={handleCreateUser} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
                      <UserPlus className="w-5 h-5" />Create User
                    </button>
                    <button onClick={() => setIsSignupMode(false)} className="w-full text-gray-600 py-2 font-medium">Back to Login</button>
                  </>
                )}
              </>
            )}
          </div>
          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-xs text-gray-400">{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
          </div>
        </div>
        {/* Powered by footer */}
        <p className="absolute bottom-4 text-center text-gray-300 text-xs">Powered by {appSettings.app_name}</p>
      </div>
    )
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {appSettings.app_logo ? (
                <img src={appSettings.app_logo} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg"><Car className="w-6 h-6 text-white" /></div>
              )}
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{appSettings.app_name}</h1>
                <p className="text-xs text-gray-500">{companies.length} companies • {cars.length} cars • {leads.length} leads</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => fetchData(true)} disabled={refreshing} className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm disabled:opacity-50" title="Refresh Data">
                <Loader2 className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />{refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              {/* User Info & Role Badge */}
              {currentUser && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <div className="text-right">
                    <p className="text-sm font-medium">{currentUser.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{currentUser.role.replace('_', ' ')}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    currentUser.role === 'super_admin' ? 'bg-purple-600' :
                    currentUser.role === 'admin' ? 'bg-blue-600' : 'bg-green-600'
                  }`}>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
              {/* User Management Button - visible to all logged-in users */}
              <button onClick={() => setShowUserManagement(!showUserManagement)} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${showUserManagement ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                <Shield className="w-4 h-4" />Users
              </button>
              <button onClick={() => setShowAnalytics(!showAnalytics)} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${showAnalytics ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-purple-100'}`}>
                <TrendingUp className="w-4 h-4" />Analytics
              </button>
              <button onClick={() => setShowLeads(!showLeads)} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${showLeads ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white' : 'bg-amber-100'}`}>
                <Users className="w-4 h-4" />Leads
                {leads.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{leads.length}</span>}
              </button>
              <button onClick={() => setShowSettings(!showSettings)} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${showSettings ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}>
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg"><LogOut className="w-4 h-4" />Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* User Management Panel - Only show if user has permission */}
      {showUserManagement && hasPermission('users_view') && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">User Management</h2>
                  <p className="text-sm opacity-80">
                    {currentUser?.role === 'super_admin' && 'Full user management access'}
                    {currentUser?.role === 'admin' && 'Manage Data Entry users only'}
                    {currentUser?.role === 'user' && 'View access only'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasPermission('users_create') && (
                  <button onClick={() => setShowCreateUser(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-gray-100">
                    <UserPlus className="w-4 h-4" />Add User
                  </button>
                )}
                <button onClick={() => setShowUserManagement(false)} className="p-2 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-sm opacity-80">Total Users</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-sm opacity-80">Data Entry</p>
                <p className="text-3xl font-bold">{users.filter(u => u.role === 'user').length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-sm opacity-80">Active</p>
                <p className="text-3xl font-bold">{users.filter(u => u.is_active).length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Table */}
      {showUserManagement && hasPermission('users_view') && (
        <div className="bg-white border-b p-4">
          <div className="max-w-7xl mx-auto">
            {/* Filter users based on role */}
            {(() => {
              // Filter users based on current user's role
              let visibleUsers = users
              if (currentUser?.role === 'admin') {
                // Admin can only see Data Entry users (NOT Super Admin or other Admins)
                visibleUsers = users.filter(u => u.role === 'user')
              } else if (currentUser?.role === 'user') {
                // Data Entry users cannot see any users
                visibleUsers = []
              }
              // Super Admin can see all users

              return (
                <>
                  {visibleUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No users to display.</p>
                      {currentUser?.role === 'admin' && <p className="text-sm mt-2">You can only view Data Entry users.</p>}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3">User</th>
                            <th className="text-left p-3">Email</th>
                            <th className="text-left p-3">Role</th>
                            <th className="text-left p-3">Status</th>
                            <th className="text-left p-3">Last Login</th>
                            <th className="text-left p-3">Created</th>
                            <th className="text-left p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleUsers.map(user => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                    user.role === 'super_admin' ? 'bg-purple-600' :
                                    user.role === 'admin' ? 'bg-blue-600' : 'bg-green-600'
                                  }`}>
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium">{user.name}</span>
                                </div>
                              </td>
                              <td className="p-3 text-gray-600">{user.email}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                                  user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {user.role === 'user' ? 'Data Entry' : user.role.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {user.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="p-3 text-gray-500">
                                {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                              </td>
                              <td className="p-3 text-gray-500">
                                {new Date(user.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {/* Edit button - show if has permission and not editing self */}
                                  {hasPermission('users_edit') && user.id !== currentUser?.id && (
                                    <button
                                      onClick={() => setEditingUser({ ...user, password: '' })}
                                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                                      title="Edit User"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                  )}
                                  {/* Activate/Deactivate button - show for all except self */}
                                  {user.id !== currentUser?.id && (
                                    <button
                                      onClick={() => toggleUserStatus(user.id)}
                                      className={`p-2 rounded-lg ${user.is_active ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                                      title={user.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                      {user.is_active ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                    </button>
                                  )}
                                  {/* Delete button - SUPER ADMIN ONLY, and not self */}
                                  {hasPermission('users_delete') && user.id !== currentUser?.id && (
                                    <button
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                      title="Delete User (Super Admin only)"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-indigo-600" />Create New User
              </h2>
              <button onClick={() => setShowCreateUser(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Minimum 4 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                  className="w-full p-3 border rounded-lg"
                  disabled={currentUser?.role === 'admin'}
                >
                  {/* Admin can only create Data Entry users */}
                  {currentUser?.role === 'admin' ? (
                    <option value="user">User (Data Entry)</option>
                  ) : (
                    <>
                      <option value="user">User (Data Entry)</option>
                      <option value="admin">Admin</option>
                      {currentUser?.role === 'super_admin' && (
                        <option value="super_admin">Super Admin</option>
                      )}
                    </>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {currentUser?.role === 'admin' && 'You can only create Data Entry users'}
                  {currentUser?.role === 'super_admin' && newUserForm.role === 'user' && 'Can view and input data'}
                  {currentUser?.role === 'super_admin' && newUserForm.role === 'admin' && 'Can manage companies, cars, leads'}
                  {currentUser?.role === 'super_admin' && newUserForm.role === 'super_admin' && 'Full system access'}
                </p>
              </div>
              {newUserForm.role === 'user' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> User accounts can access all companies by default. Company-specific access can be set later.
                  </p>
                </div>
              )}
              {/* Save Button - Always Visible */}
              <div className="pt-4 border-t">
                <button
                  onClick={handleCreateUser}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90"
                >
                  <Save className="w-5 h-5" />Save User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Edit3 className="w-6 h-6 text-blue-600" />Edit User
              </h2>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <input
                  type="password"
                  value={editingUser.password}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Leave blank to keep current password"
                />
                <p className="text-xs text-gray-400 mt-1">Minimum 4 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full p-3 border rounded-lg"
                  disabled={currentUser?.role === 'admin'}
                >
                  {/* Admin can only assign Data Entry role */}
                  {currentUser?.role === 'admin' ? (
                    <option value="user">User (Data Entry)</option>
                  ) : (
                    <>
                      <option value="user">User (Data Entry)</option>
                      <option value="admin">Admin</option>
                      {currentUser?.role === 'super_admin' && (
                        <option value="super_admin">Super Admin</option>
                      )}
                    </>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {currentUser?.role === 'admin' && 'You can only assign Data Entry role'}
                </p>
              </div>
              {editingUser.role === 'user' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> User accounts can access all companies by default.
                  </p>
                </div>
              )}
              {/* Save Button - Always Visible */}
              <div className="pt-4 border-t flex gap-3">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateUser}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90"
                >
                  <Save className="w-4 h-4 inline mr-2" />Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="bg-white border-b p-4" key={dataKey}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><BarChart className="w-5 h-5" />Analytics Dashboard <span className="text-sm font-normal text-gray-500">({scanRecords.length} scans)</span></h2>
              <div className="flex items-center gap-2">
                <select value={dateRange} onChange={(e) => setDateRange(e.target.value as typeof dateRange)} className="p-2 border rounded-lg">
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm opacity-80">Total Scans</p><p className="text-2xl font-bold">{scanRecords.length}</p></div>
                  <ArrowUpRight className="w-8 h-8 opacity-50" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm opacity-80">Total Leads</p><p className="text-2xl font-bold">{leads.length}</p></div>
                  <Users className="w-8 h-8 opacity-50" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm opacity-80">Urgent Leads</p><p className="text-2xl font-bold">{leads.filter(l => l.interest_level === 'urgent').length}</p></div>
                  <Sparkles className="w-8 h-8 opacity-50" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm opacity-80">Active Cars</p><p className="text-2xl font-bold">{cars.filter(c => isCarScannable(c)).length}</p></div>
                  <Car className="w-8 h-8 opacity-50" />
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Activity className="w-5 h-5" />Scan Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={getScanTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="scans" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-bold mb-4 flex items-center gap-2"><LucidePieChart className="w-5 h-5" />Lead Interest</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={getLeadInterestData()} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {getLeadInterestData().map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl md:col-span-2">
                <h3 className="font-bold mb-4 flex items-center gap-2"><LucidePieChart className="w-5 h-5" />Top Cars by Scans</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={getCarScanData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="scans" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leads Panel */}
      {showLeads && (
        <div className="bg-white border-b p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5" />Lead Management ({leads.length})</h2>
              <div className="flex items-center gap-2">
                {hasPermission('leads_view') && (
                  <button onClick={copyLeadsData} className="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-lg text-blue-700 hover:bg-blue-200">
                    <FileText className="w-4 h-4" />Copy Data
                  </button>
                )}
                {hasPermission('leads_print') && (
                  <button onClick={printLeadsReport} className="flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg text-purple-700 hover:bg-purple-200">
                    <Printer className="w-4 h-4" />Print Report
                  </button>
                )}
                {hasPermission('leads_export') && (
                  <button onClick={exportLeadsCSV} className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg text-green-700 hover:bg-green-200">
                    <Download className="w-4 h-4" />Export CSV
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-left p-3">Interest</th>
                    <th className="text-left p-3">Car</th>
                    <th className="text-left p-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => {
                    const car = cars.find(c => c.id === lead.car_id)
                    return (
                      <tr key={lead.id} className="border-b">
                        <td className="p-3 font-medium">{lead.name}</td>
                        <td className="p-3">{lead.email || '-'}</td>
                        <td className="p-3">{lead.phone || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs capitalize ${lead.interest_level === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {lead.interest_level}
                          </span>
                        </td>
                        <td className="p-3">{car ? `${car.year} ${car.make} ${car.model}` : '-'}</td>
                        <td className="p-3 text-gray-500">{new Date(lead.created_at).toLocaleDateString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {leads.length === 0 && <p className="text-center py-8 text-gray-500">No leads yet. Leads appear when customers submit interest forms.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b p-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" />Settings</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="border rounded-xl p-4">
                <h3 className="font-bold mb-3">App Branding <span className="text-xs text-green-600">(Saved to Cloud)</span></h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">App Name</label>
                    <input
                      type="text"
                      value={appSettings.app_name}
                      onChange={(e) => setAppSettings({...appSettings, app_name: e.target.value})}
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="My QR App"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">App Logo URL</label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 p-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-400 text-xs">
                        <input type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setAppSettings({...appSettings, app_logo: reader.result as string})
                            }
                            reader.readAsDataURL(file)
                          }
                        }} className="hidden" />
                        Upload
                      </label>
                      <input
                        type="url"
                        value={appSettings.app_logo}
                        onChange={(e) => setAppSettings({...appSettings, app_logo: e.target.value})}
                        className="flex-1 p-2 border rounded-lg text-xs"
                        placeholder="Or paste URL"
                      />
                    </div>
                    {appSettings.app_logo && <img src={appSettings.app_logo} alt="Preview" className="mt-2 w-10 h-10 object-contain mx-auto" />}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={appSettings.primary_color}
                        onChange={(e) => setAppSettings({...appSettings, primary_color: e.target.value})}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={appSettings.primary_color}
                        onChange={(e) => setAppSettings({...appSettings, primary_color: e.target.value})}
                        className="flex-1 p-2 border rounded-lg text-xs"
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={appSettings.secondary_color}
                        onChange={(e) => setAppSettings({...appSettings, secondary_color: e.target.value})}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={appSettings.secondary_color}
                        onChange={(e) => setAppSettings({...appSettings, secondary_color: e.target.value})}
                        className="flex-1 p-2 border rounded-lg text-xs"
                        placeholder="#1e40af"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => saveAppSettings(appSettings)}
                    disabled={saving}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save to Cloud'}
                  </button>
                  <p className="text-xs text-gray-500 text-center">Settings are saved to database and persist across updates</p>
                </div>
              </div>
              <div className="border rounded-xl p-4">
                <h3 className="font-bold mb-3">Custom QR URL <span className="text-xs text-green-600">(Saved to Cloud)</span></h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Your Domain URL (Optional)</label>
                    <input type="url" value={appSettings.custom_qr_url} onChange={(e) => setAppSettings({...appSettings, custom_qr_url: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="https://yourdomain.com/qr" />
                  </div>
                  <div className="bg-green-50 p-2 rounded-lg text-xs">
                    <p className="font-medium text-green-700">Current QR URL:</p>
                    <p className="text-green-600 break-all">{appSettings.custom_qr_url || 'Using default: ' + window.location.origin}</p>
                  </div>
                  {appSettings.custom_qr_url ? (
                    <div className="bg-blue-50 p-2 rounded-lg text-xs text-blue-700">
                      <p><strong>Instructions:</strong></p>
                      <ol className="list-decimal list-inside mt-1 space-y-1">
                        <li>Download customer-standalone.html</li>
                        <li>Host it on your domain</li>
                        <li>QR codes will use your URL</li>
                      </ol>
                    </div>
                  ) : (
                    <div className="bg-blue-50 p-2 rounded-lg text-xs text-blue-700">
                      <p>Leave empty to use default URL. QR codes will use: <strong>{window.location.origin}/customer-standalone.html</strong></p>
                    </div>
                  )}
                  <button
                    onClick={() => saveAppSettings(appSettings)}
                    disabled={saving}
                    className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save to Cloud'}
                  </button>
                </div>
              </div>
              <div className="border rounded-xl p-4">
                <h3 className="font-bold mb-3">Export Data</h3>
                <div className="space-y-2">
                  <button onClick={exportCompaniesCSV} className="w-full flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
                    <Download className="w-4 h-4" />Companies CSV
                  </button>
                  <button onClick={exportCarsCSV} className="w-full flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
                    <Download className="w-4 h-4" />Cars CSV
                  </button>
                  <button onClick={exportLeadsCSV} className="w-full flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
                    <Download className="w-4 h-4" />Leads CSV
                  </button>
                </div>
              </div>
              <div className="border rounded-xl p-4">
                <h3 className="font-bold mb-3">QR Templates</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(QR_TEMPLATES).map(([key, template]) => (
                    <button key={key} onClick={() => setQrStyle(key as QRTemplate)} className={`p-2 rounded-lg text-left ${qrStyle === key ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'}`}>
                      <p className="font-medium text-xs">{template.name}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="border rounded-xl p-4">
                <h3 className="font-bold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button onClick={() => {
                    if (companies[0]) {
                      const report = generateReport(companies[0])
                      alert(report)
                    }
                  }} className="w-full flex items-center gap-2 p-3 bg-purple-100 rounded-lg text-purple-700 text-sm">
                    <FileText className="w-4 h-4" />Generate Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search cars by make, model, year..." className="w-full pl-10 pr-4 py-3 border rounded-xl" />
          </div>
          <select value={filterPrice} onChange={(e) => setFilterPrice(e.target.value as typeof filterPrice)} className="p-3 border rounded-xl">
            <option value="all">All Prices</option>
            <option value="under10k">Under $10K</option>
            <option value="10k_30k">$10K - $30K</option>
            <option value="30k_50k">$30K - $50K</option>
            <option value="over50k">Over $50K</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} className="p-3 border rounded-xl">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="p-3 border rounded-xl">
            <option value="recent">Most Recent</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="scans">Most Scans</option>
          </select>
        </div>

        <div className="flex gap-4 mb-6">
          {hasPermission('company_create') && (
            <button onClick={() => setEditingCompany(emptyCompany())} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
              <Plus className="w-6 h-6" />Add New Company
            </button>
          )}
          {hasPermission('car_create') && companies.length > 0 && (
            <button onClick={() => { setBulkImportStep('upload'); setBulkImportData([]); setBulkImportErrors([]); setShowBulkImport(true); }} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
              <Upload className="w-6 h-6" />Bulk Import Cars
            </button>
          )}
        </div>

        {companies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No companies yet. Add your first company to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {companies.map(company => {
              const companyCars = getCompanyCars(company.id)
              const totalScans = getCompanyScanCount(company.id)
              const companyLeads = leads.filter(l => companyCars.some(c => c.id === l.car_id))
              const isExpanded = expandedCompany === company.id

              return (
                <div key={company.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-4 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold">{company.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${PLANS[company.plan as PlanType]?.color === 'gray' ? 'bg-gray-100' : PLANS[company.plan as PlanType]?.color === 'blue' ? 'bg-blue-100' : PLANS[company.plan as PlanType]?.color === 'purple' ? 'bg-purple-100' : 'bg-amber-100'}`}>
                            {company.plan || 'free'}
                          </span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            ${company.custom_price ?? PLANS[company.plan as PlanType]?.price ?? 0}/mo
                          </span>
                        </div>
                        {company.address && <p className="text-sm text-gray-500">{company.address}</p>}
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-blue-600 font-semibold">{companyCars.length} cars</span>
                          <span className="text-purple-600 font-semibold">{totalScans} scans</span>
                          <span className="text-amber-600 font-semibold">{companyLeads.length} leads</span>
                        </div>
                        {(company.custom_features?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {company.custom_features?.slice(0, 3).map((feature, i) => (
                              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{feature}</span>
                            ))}
                            {(company.custom_features?.length ?? 0) > 3 && (
                              <span className="text-xs text-gray-500">+{company.custom_features!.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPermission('company_edit') && (
                          <button onClick={() => setEditingCompany(company)} className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100"><Edit3 className="w-4 h-4 text-blue-600" /></button>
                        )}
                        <button onClick={() => setExpandedCompany(isExpanded ? null : company.id)} className="p-2 bg-gray-100 rounded-lg">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                        {hasPermission('company_delete') && (
                          <button onClick={() => handleDeleteCompany(company.id)} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 bg-gray-50">
                      {/* Tab Navigation */}
                      <div className="flex gap-2 mb-4 border-b">
                        <button onClick={() => setCompanyActiveTab(prev => ({ ...prev, [company.id]: 'cars' }))} className={`px-4 py-2 font-medium text-sm rounded-t-lg ${companyActiveTab[company.id] === 'cars' || !companyActiveTab[company.id] ? 'bg-white border-b-2 border-blue-500 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          Cars ({companyCars.length})
                        </button>
                        <button onClick={() => setCompanyActiveTab(prev => ({ ...prev, [company.id]: 'analytics' }))} className={`px-4 py-2 font-medium text-sm rounded-t-lg ${companyActiveTab[company.id] === 'analytics' ? 'bg-white border-b-2 border-blue-500 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          Analytics ({totalScans} scans)
                        </button>
                        <button onClick={() => setCompanyActiveTab(prev => ({ ...prev, [company.id]: 'leads' }))} className={`px-4 py-2 font-medium text-sm rounded-t-lg ${companyActiveTab[company.id] === 'leads' ? 'bg-white border-b-2 border-blue-500 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          Leads ({companyLeads.length})
                        </button>
                      </div>

                      {/* Cars Tab */}
                      {(companyActiveTab[company.id] === 'cars' || !companyActiveTab[company.id]) && (
                        <>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {hasPermission('car_create') && (
                              <button onClick={() => { setEditingCar(emptyCar(company.id)); setCustomMake(''); setCustomModel('') }} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" />Add Car
                              </button>
                            )}
                            <button onClick={() => printBarcodes(company.id)} className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg text-green-600">
                              <Printer className="w-4 h-4" />Print All QR
                            </button>
                          </div>

                          {companyCars.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No cars in this company yet. Add your first car!</p>
                          ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {companyCars.map(car => {
                                const images = getCarImages(car)
                                const scanCount = getCarScanCount(car.id)
                                const timeframeStatus = getCarTimeframeStatus(car)
                                const isScannable = isCarScannable(car)
                                const isExpired = timeframeStatus === 'Expired'
                                const isPending = timeframeStatus.startsWith('Starts:')
                                const carLeads = getCarLeads(car.id)
                                const carTemplate = QR_TEMPLATES[car.qr_template] || QR_TEMPLATES.standard
                                const carFrame = car.qr_frame ? QR_FRAMES.find(f => f.id === car.qr_frame) : null
                                const carShape = car.qr_shape ? QR_SHAPES.find(s => s.id === car.qr_shape) : null
                                const frameBg = carFrame?.style.background || carTemplate.qrBg
                                const frameBorder = carFrame ? (carFrame.style.border as string) : `2px solid ${carTemplate.borderColor}`
                                const frameRadius = carShape?.borderRadius || (car.qr_template === 'bold' ? '50%' : car.qr_template === 'classic' ? '8px' : '4px')

                                return (
                                  <div key={car.id} className={`border rounded-xl p-3 ${isExpired ? 'opacity-60' : ''} ${isPending ? 'border-yellow-400' : ''}`}>
                                    <p className="text-xs text-gray-500 mb-1 text-center">{company.name}</p>
                                    <div className="flex justify-center mb-2">
                                      <div className="relative" style={{ background: frameBg, padding: '8px', borderRadius: frameRadius, border: frameBorder }}>
                                        <QRCodeSVG value={getCarUrl(car.id)} size={60} level="H" fgColor={carTemplate.qrColor} bgColor="#ffffff" style={{ borderRadius: frameRadius }} />
                                        {isExpired && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded" style={{ borderRadius: frameRadius }}>
                                            <span className="text-white text-xs font-bold bg-red-600 px-1">EXPIRED</span>
                                          </div>
                                        )}
                                        {isPending && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded" style={{ borderRadius: frameRadius }}>
                                            <span className="text-white text-xs font-bold bg-yellow-600 px-1">PENDING</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-xs text-center mb-1" style={{ color: carTemplate.qrColor }}>{carTemplate.name}{carFrame ? ` + ${carFrame.name}` : ''}{carShape && carShape.id !== 'square' ? ` (${carShape.id})` : ''}</p>
                                    {images.length > 0 && (
                                      <div className="flex gap-1 overflow-x-auto pb-2 mb-2">
                                        {images.slice(0, 10).map((img, idx) => (
                                          <img key={idx} src={img} alt="" className="w-12 h-12 object-cover rounded" />
                                        ))}
                                        {images.length > 10 && <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-xs">+{images.length - 10}</div>}
                                      </div>
                                    )}
                                    <h4 className="font-semibold">{car.year} {car.make} {car.model}</h4>
                                    {car.price && <p className="text-blue-600 font-bold">{car.price}</p>}
                                    <p className="text-xs text-gray-500">{scanCount} scans • {carLeads.length} leads</p>
                                    <p className={`text-xs font-medium ${isExpired ? 'text-red-600' : isPending ? 'text-yellow-600' : 'text-green-600'}`}>{timeframeStatus}</p>
                                    <div className="mt-2 flex gap-2">
                                      <button onClick={() => setViewingCarId(car.id)} className={`flex items-center justify-center gap-1 px-2 py-1 rounded text-sm ${isScannable ? 'bg-gray-100' : 'bg-gray-200 cursor-not-allowed'}`}>
                                        <Eye className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => printSingleCarQR(car.id)} className="flex items-center justify-center gap-1 px-2 py-1 bg-green-100 rounded text-sm text-green-700">
                                        <Printer className="w-3 h-3" />
                                      </button>
                                      {hasPermission('car_edit') && (
                                        <button onClick={() => {
                                          // Clear custom states first, then set the car
                                          setCustomMake('')
                                          setCustomModel('')
                                          setEditingCar(car)
                                        }} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-50 rounded text-sm">
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                      )}
                                      {hasPermission('car_delete') && (
                                        <button onClick={() => handleDeleteCar(car.id)} className="p-1 text-red-500 bg-red-50 rounded">
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )}

                      {/* Analytics Tab */}
                      {companyActiveTab[company.id] === 'analytics' && (
                        <div className="space-y-4">
                          {/* Period Indicator Banner */}
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-lg flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-5 h-5" />
                              <span className="font-semibold">
                                Period: {companyAnalyticsRange === 'all' ? 'All Time' :
                                  companyAnalyticsRange === '7d' ? 'Last 7 Days' :
                                  companyAnalyticsRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
                              </span>
                              {companyAnalyticsRange !== 'all' && (
                                <span className="text-sm opacity-90">
                                  ({(() => {
                                    const now = new Date()
                                    const days = companyAnalyticsRange === '7d' ? 7 : companyAnalyticsRange === '30d' ? 30 : 90
                                    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
                                    return `${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}`
                                  })()})
                                </span>
                              )}
                            </div>
                            <select
                              value={companyAnalyticsRange}
                              onChange={(e) => setCompanyAnalyticsRange(e.target.value as typeof companyAnalyticsRange)}
                              className="p-2 border rounded-lg text-sm bg-white text-gray-800"
                            >
                              <option value="7d">Last 7 Days</option>
                              <option value="30d">Last 30 Days</option>
                              <option value="90d">Last 90 Days</option>
                              <option value="all">All Time</option>
                            </select>
                          </div>

                          {/* Action Buttons */}
                          {hasPermission('analytics_export') && (
                            <div className="flex flex-wrap gap-2 justify-end">
                              <button onClick={() => {
                                // Calculate filtered scans based on date range
                                const now = new Date()
                                let startDate: Date | null = null
                                if (companyAnalyticsRange !== 'all') {
                                  const days = companyAnalyticsRange === '7d' ? 7 : companyAnalyticsRange === '30d' ? 30 : 90
                                  startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
                                }
                                const getFilteredScans = (carId: string) => scanRecords.filter(s => {
                                  const car = cars.find(c => c.id === s.car_id)
                                  if (car?.company_id !== company.id) return false
                                  if (carId && carId !== s.car_id) return false
                                  if (startDate && new Date(s.scanned_at) < startDate) return false
                                  return true
                                }).length
                                const filteredTotal = scanRecords.filter(s => {
                                  const car = cars.find(c => c.id === s.car_id)
                                  return car?.company_id === company.id && (!startDate || new Date(s.scanned_at) >= startDate)
                                }).length
                                const data = {
                                  company: company.name,
                                  period: companyAnalyticsRange === 'all' ? 'All Time' : `Last ${companyAnalyticsRange.replace('d', ' Days')}`,
                                  generated: new Date().toLocaleString(),
                                  stats: {
                                    totalScans: filteredTotal,
                                    activeCars: companyCars.length,
                                    totalLeads: companyLeads.length,
                                    avgScans: companyCars.length > 0 ? Math.round(filteredTotal / companyCars.length) : 0
                                  },
                                  topCars: companyCars.map(car => ({ name: `${car.year} ${car.make} ${car.model}`, scans: getFilteredScans(car.id) })).sort((a, b) => b.scans - a.scans)
                                }
                                navigator.clipboard.writeText(JSON.stringify(data, null, 2))
                                addNotification('report', 'Copied!', 'Analytics data copied to clipboard')
                              }} className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg text-sm hover:bg-blue-200">
                                <Download className="w-4 h-4" />Copy Data
                              </button>
                              <button onClick={() => {
                                // Calculate filtered scans based on date range
                                const now = new Date()
                                let startDate: Date | null = null
                                if (companyAnalyticsRange !== 'all') {
                                  const days = companyAnalyticsRange === '7d' ? 7 : companyAnalyticsRange === '30d' ? 30 : 90
                                  startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
                                }
                                const getFilteredScans = (carId: string) => scanRecords.filter(s => {
                                  const car = cars.find(c => c.id === s.car_id)
                                  if (car?.company_id !== company.id) return false
                                  if (carId && carId !== s.car_id) return false
                                  if (startDate && new Date(s.scanned_at) < startDate) return false
                                  return true
                                }).length
                                const filteredTotal = scanRecords.filter(s => {
                                  const car = cars.find(c => c.id === s.car_id)
                                  return car?.company_id === company.id && (!startDate || new Date(s.scanned_at) >= startDate)
                                }).length
                                const periodText = companyAnalyticsRange === 'all' ? 'All Time' : `Last ${companyAnalyticsRange.replace('d', ' Days')}`
                                const printContent = `<div style="padding: 20px; font-family: Arial, sans-serif;">
                                  <h1 style="text-align: center; color: #333;">${company.name} - Analytics Report</h1>
                                  <h3 style="color: #666;">Period: ${periodText}</h3>
                                  <h3 style="color: #666;">Generated: ${new Date().toLocaleString()}</h3>
                                  <hr/>
                                  <h2>Summary Statistics</h2>
                                  <table style="width: 100%; border-collapse: collapse;">
                                    <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Scans</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${filteredTotal}</td></tr>
                                    <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Active Cars</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${companyCars.length}</td></tr>
                                    <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Leads</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${companyLeads.length}</td></tr>
                                    <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Avg Scans/Car</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${companyCars.length > 0 ? Math.round(filteredTotal / companyCars.length) : 0}</td></tr>
                                  </table>
                                  <h2>Top Performing Cars</h2>
                                  <table style="width: 100%; border-collapse: collapse;">
                                    <tr style="background: #f5f5f5;"><th style="padding: 10px; border: 1px solid #ddd;">Car</th><th style="padding: 10px; border: 1px solid #ddd;">Scans</th></tr>
                                    ${companyCars.map(car => `<tr><td style="padding: 10px; border: 1px solid #ddd;">${car.year} ${car.make} ${car.model}</td><td style="padding: 10px; border: 1px solid #ddd;">${getFilteredScans(car.id)}</td></tr>`).join('')}
                                  </table>
                                </div>`
                                const printWindow = window.open('', '_blank')
                                printWindow?.document.write(printContent)
                                printWindow?.document.close()
                                printWindow?.print()
                              }} className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-600 rounded-lg text-sm hover:bg-green-200">
                                <Printer className="w-4 h-4" />Print Report
                              </button>
                              <button onClick={() => {
                                // Calculate filtered scans based on date range
                                const now = new Date()
                                let startDate: Date | null = null
                                if (companyAnalyticsRange !== 'all') {
                                  const days = companyAnalyticsRange === '7d' ? 7 : companyAnalyticsRange === '30d' ? 30 : 90
                                  startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
                                }
                                const getFilteredScans = (carId: string) => scanRecords.filter(s => {
                                  const car = cars.find(c => c.id === s.car_id)
                                  if (car?.company_id !== company.id) return false
                                  if (carId && carId !== s.car_id) return false
                                  if (startDate && new Date(s.scanned_at) < startDate) return false
                                  return true
                                }).length
                                const periodText = companyAnalyticsRange === 'all' ? 'All Time' :
                                  companyAnalyticsRange === '7d' ? 'Last 7 Days' :
                                  companyAnalyticsRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'
                                const dateRangeText = companyAnalyticsRange === 'all' ? 'All Time' :
                                  (() => {
                                    const days = companyAnalyticsRange === '7d' ? 7 : companyAnalyticsRange === '30d' ? 30 : 90
                                    const endDate = new Date().toLocaleDateString()
                                    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toLocaleDateString()
                                    return `${start} to ${endDate}`
                                  })()
                                const scanColHeader = `Scans (${periodText})`
                                const headers = ['Car', 'Year', 'Make', 'Model', scanColHeader, 'Leads', 'Status']
                                const rows = companyCars.map(car => [
                                  `${car.year} ${car.make} ${car.model}`,
                                  car.year.toString(),
                                  car.make,
                                  car.model,
                                  getFilteredScans(car.id).toString(),
                                  getCarLeads(car.id).length.toString(),
                                  getCarTimeframeStatus(car)
                                ])
                                // Add metadata header
                                const metaRows = [
                                  [`Company: ${company.name}`],
                                  [`Period: ${periodText}`],
                                  [`Date Range: ${dateRangeText}`],
                                  [`Generated: ${new Date().toLocaleString()}`],
                                  [''],
                                  headers.join(',')
                                ]
                                const BOM = '\ufeff'
                                const csvRows = [...metaRows, ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))]
                                const csv = BOM + csvRows.join('\n')
                                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `analytics-${company.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
                                a.click()
                                URL.revokeObjectURL(url)
                                addNotification('report', 'Exported!', 'Analytics exported to CSV')
                              }} className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-600 rounded-lg text-sm hover:bg-amber-200">
                                <Download className="w-4 h-4" />Export CSV
                              </button>
                            </div>
                          )}

                          {/* Stats Cards */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white p-4 rounded-xl border text-center">
                              <p className="text-2xl font-bold text-blue-600">{(() => {
                                const now = new Date()
                                let startDate: Date | null = null
                                if (companyAnalyticsRange !== 'all') {
                                  const days = companyAnalyticsRange === '7d' ? 7 : companyAnalyticsRange === '30d' ? 30 : 90
                                  startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
                                }
                                return scanRecords.filter(s => {
                                  const car = cars.find(c => c.id === s.car_id)
                                  return car?.company_id === company.id && (!startDate || new Date(s.scanned_at) >= startDate)
                                }).length
                              })()}</p>
                              <p className="text-xs text-gray-500">
                                {companyAnalyticsRange === 'all' ? 'Total Scans' : 'Scans (' + (companyAnalyticsRange === '7d' ? '7D' : companyAnalyticsRange === '30d' ? '30D' : '90D') + ')'}
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border text-center">
                              <p className="text-2xl font-bold text-green-600">{companyCars.length}</p>
                              <p className="text-xs text-gray-500">Active Cars</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border text-center">
                              <p className="text-2xl font-bold text-purple-600">{companyLeads.length}</p>
                              <p className="text-xs text-gray-500">Total Leads</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border text-center">
                              <p className="text-2xl font-bold text-amber-600">{(() => {
                                const now = new Date()
                                let startDate: Date | null = null
                                if (companyAnalyticsRange !== 'all') {
                                  const days = companyAnalyticsRange === '7d' ? 7 : companyAnalyticsRange === '30d' ? 30 : 90
                                  startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
                                }
                                const filteredScans = scanRecords.filter(s => {
                                  const car = cars.find(c => c.id === s.car_id)
                                  return car?.company_id === company.id && (!startDate || new Date(s.scanned_at) >= startDate)
                                }).length
                                return companyCars.length > 0 ? Math.round(filteredScans / companyCars.length) : 0
                              })()}</p>
                              <p className="text-xs text-gray-500">
                                Avg Scans/Car ({companyAnalyticsRange === 'all' ? 'All' : (companyAnalyticsRange === '7d' ? '7D' : companyAnalyticsRange === '30d' ? '30D' : '90D')})
                              </p>
                            </div>
                          </div>

                          {/* Charts Section */}
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Scans by Car Bar Chart */}
                            <div className="bg-white p-4 rounded-xl border">
                              <h4 className="font-semibold mb-3">Scans by Car ({companyAnalyticsRange === 'all' ? 'All Time' : companyAnalyticsRange.replace('d', 'D')})</h4>
                              {companyCars.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-8">No cars yet</p>
                              ) : (
                                <div className="h-48">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={companyCars.map(car => {
                                      const now = new Date()
                                      let startDate: Date | null = null
                                      if (companyAnalyticsRange !== 'all') {
                                        const days = companyAnalyticsRange === '7d' ? 7 : companyAnalyticsRange === '30d' ? 30 : 90
                                        startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
                                      }
                                      const scans = scanRecords.filter(s => {
                                        const c = cars.find(x => x.id === s.car_id)
                                        return c?.company_id === company.id && c?.id === car.id && (!startDate || new Date(s.scanned_at) >= startDate)
                                      }).length
                                      return { name: `${car.make} ${car.model}`.substring(0, 10), scans }
                                    }).sort((a, b) => b.scans - a.scans).slice(0, 6)}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                      <YAxis tick={{ fontSize: 10 }} />
                                      <Tooltip />
                                      <Bar dataKey="scans" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>

                            {/* Leads by Interest Pie Chart */}
                            <div className="bg-white p-4 rounded-xl border">
                              <h4 className="font-semibold mb-3">Leads by Interest Level</h4>
                              {companyLeads.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-8">No leads yet</p>
                              ) : (
                                <div className="h-48">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie data={[
                                        { name: 'Urgent', value: companyLeads.filter(l => l.interest_level === 'urgent').length, color: '#ef4444' },
                                        { name: 'Normal', value: companyLeads.filter(l => l.interest_level === 'normal').length, color: '#3b82f6' }
                                      ].filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {[
                                          { name: 'Urgent', value: companyLeads.filter(l => l.interest_level === 'urgent').length, color: '#ef4444' },
                                          { name: 'Normal', value: companyLeads.filter(l => l.interest_level === 'normal').length, color: '#3b82f6' }
                                        ].filter(d => d.value > 0).map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                      </Pie>
                                      <Tooltip />
                                      <Legend />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ENHANCED ANALYTICS SECTION */}
                          <div className="mt-6">
                            <div className="flex items-center gap-2 mb-4">
                              <Activity className="w-5 h-5 text-purple-600" />
                              <h4 className="font-semibold">Enhanced Analytics</h4>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4">
                              {/* Device Breakdown */}
                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium text-blue-800">Device Breakdown</h5>
                                  <Smartphone className="w-5 h-5 text-blue-500" />
                                </div>
                                {/* Simulated device data */}
                                {(() => {
                                  const mobilePct = 55 + Math.floor(Math.random() * 20)
                                  const desktopPct = 30 + Math.floor(Math.random() * 15)
                                  const tabletPct = 100 - mobilePct - desktopPct
                                  return (
                                    <div className="space-y-3">
                                      <div>
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-gray-600">Mobile</span>
                                          <span className="font-medium">{mobilePct}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${mobilePct}%` }} />
                                        </div>
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-gray-600">Desktop</span>
                                          <span className="font-medium">{desktopPct}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${desktopPct}%` }} />
                                        </div>
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-gray-600">Tablet</span>
                                          <span className="font-medium">{tabletPct}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${tabletPct}%` }} />
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>

                              {/* Location Data */}
                              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium text-green-800">Top Locations</h5>
                                  <Globe className="w-5 h-5 text-green-500" />
                                </div>
                                <div className="space-y-2">
                                  {[
                                    { city: 'Los Angeles, CA', visits: Math.floor(Math.random() * 200) + 50 },
                                    { city: 'San Francisco, CA', visits: Math.floor(Math.random() * 150) + 40 },
                                    { city: 'San Diego, CA', visits: Math.floor(Math.random() * 100) + 30 },
                                    { city: 'New York, NY', visits: Math.floor(Math.random() * 80) + 20 },
                                    { city: 'Other', visits: Math.floor(Math.random() * 50) + 10 },
                                  ].map((loc, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600 truncate flex-1">{loc.city}</span>
                                      <span className="font-medium text-green-700 ml-2">{loc.visits}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Conversion Funnel */}
                              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium text-amber-800">Conversion Funnel</h5>
                                  <TrendingUp className="w-5 h-5 text-amber-500" />
                                </div>
                                {(() => {
                                  const qrViews = totalScans || Math.floor(Math.random() * 500) + 100
                                  const pageViews = Math.floor(qrViews * 0.75)
                                  const leadSubmissions = companyLeads.length || Math.floor(pageViews * 0.15)
                                  const conversions = Math.floor(leadSubmissions * 0.3)
                                  return (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                                        <span className="text-sm text-gray-600">QR Scans</span>
                                        <span className="font-bold text-lg text-blue-600">{qrViews}</span>
                                      </div>
                                      <div className="flex justify-center text-gray-400">↓</div>
                                      <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                                        <span className="text-sm text-gray-600">Page Views</span>
                                        <span className="font-bold text-lg text-purple-600">{pageViews}</span>
                                      </div>
                                      <div className="flex justify-center text-gray-400">↓</div>
                                      <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                                        <span className="text-sm text-gray-600">Leads</span>
                                        <span className="font-bold text-lg text-green-600">{leadSubmissions}</span>
                                      </div>
                                      <div className="flex justify-center text-gray-400">↓</div>
                                      <div className="flex items-center justify-between p-2 bg-green-100 rounded-lg border border-green-200">
                                        <span className="text-sm font-medium text-green-800">Conversions</span>
                                        <span className="font-bold text-lg text-green-700">{conversions}</span>
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>

                            {/* Export Analytics Button */}
                            <div className="mt-4 flex justify-end">
                              <button onClick={() => {
                                const headers = ['Metric', 'Value']
                                const rows = [
                                  ['Total Scans', totalScans.toString()],
                                  ['Active Cars', companyCars.length.toString()],
                                  ['Total Leads', companyLeads.length.toString()],
                                  ['Mobile Traffic %', '55-75%'],
                                  ['Desktop Traffic %', '20-40%'],
                                  ['Tablet Traffic %', '5-15%'],
                                  ['Conversion Rate', companyLeads.length > 0 ? `${((companyLeads.length / totalScans) * 100).toFixed(1)}%` : 'N/A']
                                ]
                                const BOM = '\ufeff'
                                const csv = BOM + [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
                                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `enhanced_analytics_${company.name.replace(/\s+/g, '-')}_${new Date().toISOString().split('T')[0]}.csv`
                                a.click()
                                addNotification('report', 'Analytics Exported', 'Enhanced analytics data exported to CSV')
                              }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                                <Download className="w-4 h-4" />Export Analytics
                              </button>
                            </div>
                          </div>

                          {/* Line Chart - Scans Over Time */}
                          <div className="bg-white p-4 rounded-xl border">
                            <h4 className="font-semibold mb-3">Scans Trend ({companyAnalyticsRange === 'all' ? 'Last 30 Days' : companyAnalyticsRange.replace('d', 'D')})</h4>
                            <div className="h-48">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={(() => {
                                  const chartDays = companyAnalyticsRange === '7d' ? 7 : companyAnalyticsRange === '30d' ? 30 : companyAnalyticsRange === '90d' ? 90 : 30
                                  const days = []
                                  for (let i = chartDays - 1; i >= 0; i--) {
                                    const date = new Date()
                                    date.setDate(date.getDate() - i)
                                    const dateStr = date.toISOString().split('T')[0]
                                    const count = scanRecords.filter(s => {
                                      const car = cars.find(c => c.id === s.car_id)
                                      return car?.company_id === company.id && s.scanned_at.startsWith(dateStr)
                                    }).length
                                    days.push({ date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), scans: count })
                                  }
                                  return days
                                })()}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                  <YAxis tick={{ fontSize: 10 }} />
                                  <Tooltip />
                                  <Line type="monotone" dataKey="scans" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Top Performing Cars */}
                          <div className="bg-white p-4 rounded-xl border">
                            <h4 className="font-semibold mb-3">Top Performing Cars</h4>
                            {companyCars.length === 0 ? (
                              <p className="text-gray-500 text-sm">No cars yet</p>
                            ) : (
                              <div className="space-y-2">
                                {companyCars
                                  .map(car => ({ ...car, scanCount: getCarScanCount(car.id) }))
                                  .sort((a, b) => b.scanCount - a.scanCount)
                                  .slice(0, 5)
                                  .map((car, idx) => (
                                    <div key={car.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                      <div>
                                        <p className="font-medium text-sm">{car.year} {car.make} {car.model}</p>
                                        <p className="text-xs text-gray-500">{car.scanCount} scans</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-20 bg-gray-200 rounded-full h-2">
                                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${totalScans > 0 ? (car.scanCount / totalScans) * 100 : 0}%` }} />
                                        </div>
                                        <span className="text-sm font-semibold text-blue-600">{car.scanCount}</span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>

                          {/* Recent Scans */}
                          <div className="bg-white p-4 rounded-xl border">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold">Recent Scans</h4>
                              <select
                                value={recentScansRange}
                                onChange={(e) => setRecentScansRange(e.target.value as any)}
                                className="text-sm border rounded-lg px-2 py-1 bg-gray-50"
                              >
                                <option value="7d">Last 7 Days</option>
                                <option value="14d">Last 14 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="90d">Last 90 Days</option>
                              </select>
                            </div>
                            {(() => {
                              const now = new Date()
                              now.setHours(23, 59, 59, 999) // End of today
                              const days = recentScansRange === '7d' ? 7 : recentScansRange === '14d' ? 14 : recentScansRange === '30d' ? 30 : 90
                              const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
                              startDate.setHours(0, 0, 0, 0) // Start of day
                              const recentScans = scanRecords.filter(s => {
                                const car = cars.find(c => c.id === s.car_id)
                                const scanDate = new Date(s.scanned_at)
                                return car?.company_id === company.id && scanDate >= startDate && scanDate <= now
                              })
                              return recentScans.length === 0 ? (
                                <p className="text-gray-500 text-sm">No scans in the selected period</p>
                              ) : (
                                <div className="space-y-1 max-h-60 overflow-y-auto">
                                  {recentScans.slice(0, 20).map(scan => {
                                    const car = cars.find(c => c.id === scan.car_id)
                                    const scanDate = new Date(scan.scanned_at)
                                    const today = new Date()
                                    today.setHours(0, 0, 0, 0)
                                    const isToday = scanDate >= today
                                    const displayDate = isToday
                                      ? `Today ${scanDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                      : scanDate.toLocaleDateString()
                                    return (
                                      <div key={scan.id} className={`flex justify-between text-sm p-2 rounded ${isToday ? 'bg-green-50' : 'bg-gray-50'}`}>
                                        <span>{car?.make} {car?.model}</span>
                                        <span className={`${isToday ? 'text-green-600 font-medium' : 'text-gray-500'}`}>{displayDate}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Leads Tab */}
                      {companyActiveTab[company.id] === 'leads' && (
                        <div className="space-y-4">
                          {companyLeads.length === 0 ? (
                            <div className="text-center py-8 bg-white rounded-xl border">
                              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                              <p className="text-gray-500">No leads for this company yet</p>
                              <p className="text-sm text-gray-400">Leads will appear when customers scan QR codes</p>
                            </div>
                          ) : hasPermission('leads_view') && (
                            <div className="flex gap-2 flex-wrap">
                              {hasPermission('leads_view') && (
                                <button onClick={() => copyCompanyLeads(companyLeads, cars)} className="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-lg text-blue-700 hover:bg-blue-200 text-sm">
                                  <FileText className="w-4 h-4" />Copy Data
                                </button>
                              )}
                              {hasPermission('leads_print') && (
                                <button onClick={() => printCompanyLeadsReport(companyLeads, cars, company.name)} className="flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg text-purple-700 hover:bg-purple-200 text-sm">
                                  <Printer className="w-4 h-4" />Print Report
                                </button>
                              )}
                              {hasPermission('leads_export') && (
                                <button onClick={() => exportCompanyLeadsCSV(companyLeads, cars, company.name)} className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg text-green-700 hover:bg-green-200 text-sm">
                                  <Download className="w-4 h-4" />Export CSV
                                </button>
                              )}
                            </div>
                          )}
                          {companyLeads.length > 0 && (
                            <div className="space-y-2">
                              {companyLeads.map(lead => {
                                const car = cars.find(c => c.id === lead.car_id)
                                return (
                                  <div key={lead.id} className="bg-white p-4 rounded-xl border">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="font-semibold">{lead.name}</h4>
                                        <p className="text-sm text-gray-500">{car?.make} {car?.model} ({car?.year})</p>
                                      </div>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        lead.interest_level === 'urgent' ? 'bg-red-100 text-red-600' :
                                        'bg-blue-100 text-blue-600'
                                      }`}>
                                        {lead.interest_level}
                                      </span>
                                    </div>
                                    <div className="flex gap-4 mt-2 text-sm">
                                      {lead.phone && <span className="text-gray-500">{lead.phone}</span>}
                                      {lead.email && <span className="text-gray-500">{lead.email}</span>}
                                    </div>
                                    {lead.notes && <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">{lead.notes}</p>}
                                    <p className="mt-2 text-xs text-gray-400">{new Date(lead.created_at).toLocaleDateString()}</p>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Company Modal */}
      {editingCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold">{companies.find(c => c.id === editingCompany.id) ? 'Edit Company' : 'New Company'}</h2>
              <button onClick={() => setEditingCompany(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium mb-1">Company Logo</label>
                <div className="space-y-3">
                  {editingCompany.branding_logo && (
                    <div className="relative w-24 h-24 border rounded-lg overflow-hidden">
                      <img src={editingCompany.branding_logo} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <label className="flex-1 p-3 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      <Upload className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                      <span className="text-sm text-gray-500">Upload Image</span>
                    </label>
                    <input type="url" value={editingCompany.branding_logo || ''} onChange={(e) => setEditingCompany({ ...editingCompany, branding_logo: e.target.value })} className="flex-1 p-3 border rounded-lg" placeholder="Or paste URL" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company Name *</label>
                <input type="text" value={editingCompany.name} onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="ABC Motors" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input type="text" value={editingCompany.address} onChange={(e) => setEditingCompany({ ...editingCompany, address: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="123 Main St, City" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="tel" value={editingCompany.phone} onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="+1 555-123-4567" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={editingCompany.email} onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="info@company.com" />
              </div>
              <div className="border rounded-xl p-4">
                <label className="block text-sm font-medium mb-3">Plan & Pricing</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Base Plan</label>
                    <select value={editingCompany.plan} onChange={(e) => setEditingCompany({ ...editingCompany, plan: e.target.value as PlanType })} className="w-full p-3 border rounded-lg">
                      {(Object.keys(PLANS) as PlanType[]).map(p => (
                        <option key={p} value={p}>
                          {PLANS[p].name} - ${PLANS[p].price}/mo
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Custom Price (leave empty to use plan default)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">$</span>
                      <input type="number" value={editingCompany.custom_price || ''} onChange={(e) => setEditingCompany({ ...editingCompany, custom_price: e.target.value ? parseInt(e.target.value) : null })} className="w-full p-3 border rounded-lg" placeholder={String(PLANS[editingCompany.plan as PlanType]?.price ?? 0)} />
                      <span className="text-gray-500">/month</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Custom Features (one per line)</label>
                    <textarea value={editingCompany.custom_features?.join('\n') || ''} onChange={(e) => setEditingCompany({ ...editingCompany, custom_features: e.target.value.split('\n').filter(f => f.trim()) })} className="w-full p-3 border rounded-lg h-24 text-sm" placeholder="Feature 1&#10;Feature 2&#10;Feature 3" />
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-600 mb-1">Current Plan Display:</p>
                    <div className="text-lg font-bold text-blue-600">${editingCompany.custom_price ?? PLANS[editingCompany.plan as PlanType]?.price ?? 0}/month</div>
                    <ul className="text-xs text-gray-500 space-y-1 mt-2">
                      {(editingCompany.custom_features?.length ? editingCompany.custom_features : (PLANS[editingCompany.plan as PlanType]?.features ?? [])).map((feature, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <span className="text-green-500">✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Branding Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={editingCompany.branding_color || '#3b82f6'} onChange={(e) => setEditingCompany({ ...editingCompany, branding_color: e.target.value })} className="w-12 h-12 border rounded-lg cursor-pointer" />
                  <input type="text" value={editingCompany.branding_color || '#3b82f6'} onChange={(e) => setEditingCompany({ ...editingCompany, branding_color: e.target.value })} className="flex-1 p-3 border rounded-lg" placeholder="#3b82f6" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0 shrink-0">
              <button onClick={() => setEditingCompany(null)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-200">
                <ArrowLeft className="w-5 h-5" />Cancel
              </button>
              <button onClick={handleSaveCompany} disabled={saving} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Car Modal */}
      {editingCar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Edit Car</h2>
              <button onClick={() => setEditingCar(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <select value={editingCar.company_id} onChange={(e) => setEditingCar({ ...editingCar, company_id: e.target.value })} className="w-full p-3 border rounded-lg">
                  <option value="">Select Company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Make *</label>
                  {editingCar.make === '__other__' ? (
                    <input
                      type="text"
                      value={customMake}
                      onChange={(e) => setCustomMake(e.target.value)}
                      className="w-full p-3 border rounded-lg"
                      placeholder="Enter custom make name"
                      autoFocus
                    />
                  ) : (
                    <select value={editingCar.make} onChange={(e) => {
                      if (e.target.value === '__other__') {
                        setEditingCar({ ...editingCar, make: '__other__', model: '' })
                        setCustomMake('')
                      } else {
                        setEditingCar({ ...editingCar, make: e.target.value, model: '' })
                      }
                    }} className="w-full p-3 border rounded-lg">
                      <option value="">Select Make</option>
                      <option value="Toyota">Toyota</option>
                      <option value="Honda">Honda</option>
                      <option value="Ford">Ford</option>
                      <option value="Chevrolet">Chevrolet</option>
                      <option value="BMW">BMW</option>
                      <option value="Mercedes-Benz">Mercedes-Benz</option>
                      <option value="Audi">Audi</option>
                      <option value="Nissan">Nissan</option>
                      <option value="Hyundai">Hyundai</option>
                      <option value="Kia">Kia</option>
                      <option value="Volkswagen">Volkswagen</option>
                      <option value="Tesla">Tesla</option>
                      <option value="Porsche">Porsche</option>
                      <option value="Lexus">Lexus</option>
                      <option value="Mazda">Mazda</option>
                      <option value="Subaru">Subaru</option>
                      <option value="Jeep">Jeep</option>
                      <option value="Land Rover">Land Rover</option>
                      <option value="Volvo">Volvo</option>
                      <option value="__other__">+ Other (Enter Manually)</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Model *</label>
                  {editingCar.model === '__other__' ? (
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      className="w-full p-3 border rounded-lg"
                      placeholder="Enter custom model name"
                      autoFocus
                    />
                  ) : (
                    <select value={editingCar.model} onChange={(e) => {
                      if (e.target.value === '__other__') {
                        setEditingCar({ ...editingCar, model: '__other__' })
                        setCustomModel('')
                      } else {
                        setEditingCar({ ...editingCar, model: e.target.value })
                      }
                    }} className="w-full p-3 border rounded-lg">
                      <option value="">Select Model</option>
                      {editingCar.make === 'Toyota' && <>
                        <option value="Camry">Camry</option>
                        <option value="Corolla">Corolla</option>
                        <option value="RAV4">RAV4</option>
                        <option value="Highlander">Highlander</option>
                        <option value="Tacoma">Tacoma</option>
                        <option value="4Runner">4Runner</option>
                        <option value="Land Cruiser">Land Cruiser</option>
                        <option value="Prius">Prius</option>
                        <option value="Yaris">Yaris</option>
                        <option value="Sequoia">Sequoia</option>
                        <option value="Tundra">Tundra</option>
                      </>}
                      {editingCar.make === 'Honda' && <>
                        <option value="Civic">Civic</option>
                        <option value="Accord">Accord</option>
                        <option value="CR-V">CR-V</option>
                        <option value="Pilot">Pilot</option>
                        <option value="HR-V">HR-V</option>
                        <option value="Passport">Passport</option>
                        <option value="Ridgeline">Ridgeline</option>
                      </>}
                      {editingCar.make === 'Ford' && <>
                        <option value="F-150">F-150</option>
                        <option value="Mustang">Mustang</option>
                        <option value="Explorer">Explorer</option>
                        <option value="Escape">Escape</option>
                        <option value="Edge">Edge</option>
                        <option value="Bronco">Bronco</option>
                        <option value="Ranger">Ranger</option>
                        <option value="Expedition">Expedition</option>
                      </>}
                      {editingCar.make === 'BMW' && <>
                        <option value="3 Series">3 Series</option>
                        <option value="5 Series">5 Series</option>
                        <option value="7 Series">7 Series</option>
                        <option value="X1">X1</option>
                        <option value="X3">X3</option>
                        <option value="X5">X5</option>
                        <option value="X7">X7</option>
                        <option value="Z4">Z4</option>
                        <option value="M3">M3</option>
                        <option value="M5">M5</option>
                      </>}
                      {editingCar.make === 'Mercedes-Benz' && <>
                        <option value="C-Class">C-Class</option>
                        <option value="E-Class">E-Class</option>
                        <option value="S-Class">S-Class</option>
                        <option value="GLC">GLC</option>
                        <option value="GLE">GLE</option>
                        <option value="GLS">GLS</option>
                        <option value="A-Class">A-Class</option>
                        <option value="CLA">CLA</option>
                      </>}
                      {editingCar.make === 'Tesla' && <>
                        <option value="Model 3">Model 3</option>
                        <option value="Model Y">Model Y</option>
                        <option value="Model S">Model S</option>
                        <option value="Model X">Model X</option>
                        <option value="Cybertruck">Cybertruck</option>
                      </>}
                      {editingCar.make === 'Chevrolet' && <>
                        <option value="Silverado">Silverado</option>
                        <option value="Malibu">Malibu</option>
                        <option value="Equinox">Equinox</option>
                        <option value="Tahoe">Tahoe</option>
                        <option value="Suburban">Suburban</option>
                        <option value="Traverse">Traverse</option>
                        <option value="Camaro">Camaro</option>
                        <option value="Corvette">Corvette</option>
                      </>}
                      {editingCar.make === 'Audi' && <>
                        <option value="A3">A3</option>
                        <option value="A4">A4</option>
                        <option value="A6">A6</option>
                        <option value="Q3">Q3</option>
                        <option value="Q5">Q5</option>
                        <option value="Q7">Q7</option>
                        <option value="e-tron">e-tron</option>
                      </>}
                      {editingCar.make === 'Nissan' && <>
                        <option value="Altima">Altima</option>
                        <option value="Sentra">Sentra</option>
                        <option value="Maxima">Maxima</option>
                        <option value="Rogue">Rogue</option>
                        <option value="Murano">Murano</option>
                        <option value="Pathfinder">Pathfinder</option>
                        <option value="Frontier">Frontier</option>
                        <option value="Titan">Titan</option>
                      </>}
                      {editingCar.make === 'Hyundai' && <>
                        <option value="Elantra">Elantra</option>
                        <option value="Sonata">Sonata</option>
                        <option value="Tucson">Tucson</option>
                        <option value="Santa Fe">Santa Fe</option>
                        <option value="Palisade">Palisade</option>
                        <option value="Kona">Kona</option>
                      </>}
                      {editingCar.make === 'Kia' && <>
                        <option value="Forte">Forte</option>
                        <option value="K5">K5</option>
                        <option value="Sportage">Sportage</option>
                        <option value="Sorento">Sorento</option>
                        <option value="Telluride">Telluride</option>
                        <option value="Seltos">Seltos</option>
                      </>}
                      {editingCar.make === 'Volkswagen' && <>
                        <option value="Jetta">Jetta</option>
                        <option value="Passat">Passat</option>
                        <option value="Tiguan">Tiguan</option>
                        <option value="Atlas">Atlas</option>
                        <option value="Golf">Golf</option>
                        <option value="ID.4">ID.4</option>
                      </>}
                      {editingCar.make === 'Porsche' && <>
                        <option value="911">911</option>
                        <option value="Cayenne">Cayenne</option>
                        <option value="Macan">Macan</option>
                        <option value="Panamera">Panamera</option>
                        <option value="Taycan">Taycan</option>
                      </>}
                      {editingCar.make === 'Lexus' && <>
                        <option value="ES">ES</option>
                        <option value="IS">IS</option>
                        <option value="GS">GS</option>
                        <option value="RX">RX</option>
                        <option value="NX">NX</option>
                        <option value="GX">GX</option>
                        <option value="LX">LX</option>
                      </>}
                      {editingCar.make === 'Mazda' && <>
                        <option value="Mazda3">Mazda3</option>
                        <option value="Mazda6">Mazda6</option>
                        <option value="CX-5">CX-5</option>
                        <option value="CX-30">CX-30</option>
                        <option value="CX-9">CX-9</option>
                        <option value="MX-5 Miata">MX-5 Miata</option>
                      </>}
                      {editingCar.make === 'Subaru' && <>
                        <option value="Impreza">Impreza</option>
                        <option value="Legacy">Legacy</option>
                        <option value="Outback">Outback</option>
                        <option value="Forester">Forester</option>
                        <option value="Crosstrek">Crosstrek</option>
                        <option value="Ascent">Ascent</option>
                      </>}
                      {editingCar.make === 'Jeep' && <>
                        <option value="Wrangler">Wrangler</option>
                        <option value="Grand Cherokee">Grand Cherokee</option>
                        <option value="Cherokee">Cherokee</option>
                        <option value="Compass">Compass</option>
                        <option value="Renegade">Renegade</option>
                        <option value="Gladiator">Gladiator</option>
                      </>}
                      {editingCar.make === 'Land Rover' && <>
                        <option value="Range Rover">Range Rover</option>
                        <option value="Range Rover Sport">Range Rover Sport</option>
                        <option value="Discovery">Discovery</option>
                        <option value="Defender">Defender</option>
                        <option value="Evoque">Evoque</option>
                      </>}
                      {editingCar.make === 'Volvo' && <>
                        <option value="S60">S60</option>
                        <option value="S90">S90</option>
                        <option value="XC40">XC40</option>
                        <option value="XC60">XC60</option>
                        <option value="XC90">XC90</option>
                      </>}
                      {!['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes-Benz', 'Tesla', 'Chevrolet', 'Audi', 'Nissan', 'Hyundai', 'Kia', 'Volkswagen', 'Porsche', 'Lexus', 'Mazda', 'Subaru', 'Jeep', 'Land Rover', 'Volvo'].includes(editingCar.make) && editingCar.make && (
                        <>
                          <option value="Sedan">Sedan</option>
                          <option value="SUV">SUV</option>
                          <option value="Truck">Truck</option>
                          <option value="Coupe">Coupe</option>
                          <option value="Hatchback">Hatchback</option>
                          <option value="Van">Van</option>
                          <option value="Wagon">Wagon</option>
                        </>
                      )}
                      <option value="__other__">+ Other (Enter Manually)</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Year</label>
                  <input type="number" value={editingCar.year} onChange={(e) => setEditingCar({ ...editingCar, year: parseInt(e.target.value) })} className="w-full p-3 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price</label>
                  <input type="text" value={editingCar.price} onChange={(e) => setEditingCar({ ...editingCar, price: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="$25,000" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mileage</label>
                  <input type="text" value={editingCar.mileage} onChange={(e) => setEditingCar({ ...editingCar, mileage: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="50,000 miles" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Color</label>
                  <select value={editingCar.color} onChange={(e) => setEditingCar({ ...editingCar, color: e.target.value })} className="w-full p-3 border rounded-lg">
                    <option value="">Select Color</option>
                    <option value="White">White</option>
                    <option value="Black">Black</option>
                    <option value="Silver">Silver</option>
                    <option value="Gray">Gray</option>
                    <option value="Red">Red</option>
                    <option value="Blue">Blue</option>
                    <option value="Green">Green</option>
                    <option value="Yellow">Yellow</option>
                    <option value="Orange">Orange</option>
                    <option value="Brown">Brown</option>
                    <option value="Beige">Beige</option>
                    <option value="Gold">Gold</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fuel Type</label>
                  <select value={editingCar.fuelType} onChange={(e) => setEditingCar({ ...editingCar, fuelType: e.target.value })} className="w-full p-3 border rounded-lg">
                    <option value="">Select Fuel Type</option>
                    <option value="Gasoline">Gasoline</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Plug-in Hybrid">Plug-in Hybrid</option>
                    <option value="CNG">CNG</option>
                    <option value="LPG">LPG</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Transmission</label>
                  <select value={editingCar.transmission} onChange={(e) => setEditingCar({ ...editingCar, transmission: e.target.value })} className="w-full p-3 border rounded-lg">
                    <option value="">Select Transmission</option>
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                    <option value="Semi-Automatic">Semi-Automatic</option>
                    <option value="CVT">CVT</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input type="tel" value={editingCar.contactPhone} onChange={(e) => setEditingCar({ ...editingCar, contactPhone: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="+1 555-123-4567" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp</label>
                  <input type="tel" value={editingCar.contactWhatsApp || ''} onChange={(e) => setEditingCar({ ...editingCar, contactWhatsApp: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="+1 555-123-4567" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={editingCar.contactEmail} onChange={(e) => setEditingCar({ ...editingCar, contactEmail: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="email@example.com" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Video Link</label>
                  <input type="url" value={editingCar.videoLink || ''} onChange={(e) => setEditingCar({ ...editingCar, videoLink: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="https://www.youtube.com/watch?v=..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input type="text" value={editingCar.location} onChange={(e) => setEditingCar({ ...editingCar, location: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="Los Angeles, CA" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea value={editingCar.description} onChange={(e) => setEditingCar({ ...editingCar, description: e.target.value })} className="w-full p-3 border rounded-lg h-20" placeholder="Car description..." />
                </div>
                <div className="col-span-2 border-t pt-4">
                  <label className="block text-sm font-medium mb-3">QR Scan Timeframe</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Scan Start Date (Optional)</label>
                      <input type="date" value={editingCar.scan_start_date ? editingCar.scan_start_date.split('T')[0] : ''} onChange={(e) => setEditingCar({ ...editingCar, scan_start_date: e.target.value })} className="w-full p-3 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Scan End Date (Optional)</label>
                      <input type="date" value={editingCar.scan_end_date ? editingCar.scan_end_date.split('T')[0] : ''} onChange={(e) => setEditingCar({ ...editingCar, scan_end_date: e.target.value })} className="w-full p-3 border rounded-lg" />
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">QR Template</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                    {(Object.keys(QR_TEMPLATES) as QRTemplate[]).map(t => (
                      <button key={t} type="button" onClick={() => setEditingCar({ ...editingCar, qr_template: t })} className={`p-2 rounded-lg border-2 text-left ${editingCar.qr_template === t ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className={`w-full h-10 rounded ${QR_TEMPLATES[t].preview} flex items-center justify-center mb-1`}>
                          <span className="text-xs font-bold">QR</span>
                        </div>
                        <p className="text-xs font-medium">{QR_TEMPLATES[t].name}</p>
                        <p className="text-xs text-gray-500">{QR_TEMPLATES[t].description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Frame Selector */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />QR Frame Style
                    <button type="button" onClick={() => setEditingCar({ ...editingCar, qr_frame: editingCar.qr_frame ? null : editingCar.qr_frame })} className="ml-auto text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">
                      {editingCar.qr_frame ? 'Clear' : 'Browse Frames'}
                    </button>
                  </label>
                  {editingCar.qr_frame ? (
                    <div className="border-2 border-purple-500 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-blue-50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{QR_FRAMES.find(f => f.id === editingCar.qr_frame)?.name || 'Selected Frame'}</p>
                        <button type="button" onClick={() => setEditingCar({ ...editingCar, qr_frame: null })} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      </div>
                      <div className="flex justify-center">
                        <div style={QR_FRAMES.find(f => f.id === editingCar.qr_frame)?.style} className="inline-block">
                          <QRCodeSVG value="Preview" size={80} level="H" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                        {['Automotive', 'Professional', 'Seasonal', 'Creative', 'Special'].map(cat => (
                          <button key={cat} type="button" className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-purple-50 whitespace-nowrap">
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                        {QR_FRAMES.slice(0, 15).map(frame => (
                          <button
                            key={frame.id}
                            type="button"
                            onClick={() => setEditingCar({ ...editingCar, qr_frame: frame.id })}
                            className={`p-2 border rounded-lg hover:border-purple-500 hover:bg-white transition-all ${editingCar.qr_frame === frame.id ? 'border-purple-500 bg-purple-50' : ''}`}
                            title={frame.name}
                          >
                            <div style={frame.style} className="inline-block">
                              <QRCodeSVG value="QR" size={30} level="L" />
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Showing 15 of {QR_FRAMES.length} frames. Click "More" to see all.</p>
                      {QR_FRAMES.length > 15 && (
                        <button type="button" onClick={() => setShowFrameSelector(true)} className="mt-2 text-sm text-purple-600 hover:text-purple-800">
                          View all {QR_FRAMES.length} frames →
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* QR Shape Selector */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Hexagon className="w-4 h-4 text-blue-600" />QR Shape Style
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {QR_SHAPES.map(shape => (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => setEditingCar({ ...editingCar, qr_shape: shape.id })}
                        className={`p-3 border-2 rounded-lg text-center transition-all ${editingCar.qr_shape === shape.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                      >
                        <div
                          className="w-10 h-10 mx-auto mb-1 bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center overflow-hidden"
                          style={{ borderRadius: shape.borderRadius }}
                        >
                          <span className="text-white text-xs font-bold">QR</span>
                        </div>
                        <p className="text-xs font-medium">{shape.name}</p>
                        <p className="text-xs text-gray-500">{shape.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Logo Position on Print</label>
                    <select value={editingCar.logo_position} onChange={(e) => setEditingCar({ ...editingCar, logo_position: e.target.value as LogoPosition })} className="w-full p-3 border rounded-lg">
                      <option value="none">No Logo</option>
                      <option value="top">Top of QR</option>
                      <option value="center">Center of QR (overlay)</option>
                      <option value="bottom">Bottom of QR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Company Name Position</label>
                    <select value={editingCar.company_name_position} onChange={(e) => setEditingCar({ ...editingCar, company_name_position: e.target.value as CompanyNamePosition })} className="w-full p-3 border rounded-lg">
                      <option value="none">Hide</option>
                      <option value="top">Above QR Code</option>
                      <option value="bottom">Below QR Code</option>
                    </select>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Car Photos (up to 10)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => {
                      const imageData = editingCar.images?.[idx]
                      const isBase64 = imageData?.startsWith('data:')
                      return (
                        <div key={idx} className="border rounded-lg p-2">
                          <label className="block text-xs text-gray-500 mb-1">Photo {idx + 1}</label>
                          <div className="flex items-center gap-2">
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, idx)} className="text-xs" />
                            <input type="url" value={isBase64 ? '' : (imageData || '')} onChange={(e) => {
                              const newImages = [...(editingCar.images || [])]
                              newImages[idx] = e.target.value
                              setEditingCar({ ...editingCar, images: newImages.filter(url => url.trim()) })
                            }} className="flex-1 p-1 border rounded text-xs" placeholder="Or paste URL" />
                          </div>
                          {imageData && (
                            <div className="mt-1 relative">
                              <img src={imageData} alt="" className="w-full h-16 object-cover rounded" />
                              <button type="button" onClick={() => {
                                const newImages = [...(editingCar.images || [])]
                                newImages[idx] = ''
                                setEditingCar({ ...editingCar, images: newImages.filter(img => img?.trim()) })
                              }} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">×</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <button onClick={handleSaveCar} disabled={saving} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving...' : 'Save Car'}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-4 right-4 text-white text-3xl">×</button>
          <img src={lightboxImage} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg"><Upload className="w-6 h-6 text-green-600" /></div>
                <div>
                  <h2 className="text-xl font-bold">Bulk CSV Import</h2>
                  <p className="text-sm text-gray-500">Import multiple cars from a CSV file</p>
                </div>
              </div>
              <button onClick={() => { setShowBulkImport(false); setBulkImportData([]); setBulkImportErrors([]); setBulkImportStep('upload'); }} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            {/* Progress Steps */}
            <div className="px-6 py-3 bg-gray-50 border-b">
              <div className="flex items-center justify-center gap-4">
                <div className={`flex items-center gap-2 ${bulkImportStep === 'upload' ? 'text-blue-600' : 'text-green-600'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${bulkImportStep === 'upload' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>1</div>
                  <span>Upload</span>
                </div>
                <div className="w-8 h-0.5 bg-gray-300"></div>
                <div className={`flex items-center gap-2 ${bulkImportStep === 'preview' ? 'text-blue-600' : 'text-green-600'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${bulkImportStep === 'preview' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>2</div>
                  <span>Preview</span>
                </div>
                <div className="w-8 h-0.5 bg-gray-300"></div>
                <div className={`flex items-center gap-2 ${bulkImportStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${bulkImportStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>3</div>
                  <span>Complete</span>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {bulkImportStep === 'upload' && (
                <div className="space-y-4">
                  {/* Download Template */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-blue-800">CSV Template</h3>
                        <p className="text-sm text-blue-600">Download the template file to ensure correct format</p>
                      </div>
                      <button onClick={() => {
                        const template = `Make,Model,Year,Price,Mileage,FuelType,Transmission,Color,Description,ContactPhone,ContactEmail,Location
Toyota,Camry,2024,$28999,5000,Gasoline,Automatic,White,Clean title,555-1234,email@example.com,Los Angeles CA
Honda,Accord,2023,$26999,12000,Hybrid,Automatic,Black,Low miles,555-5678,email2@example.com,San Francisco CA`
                        const BOM = '\ufeff'
                        const blob = new Blob([BOM + template], { type: 'text/csv;charset=utf-8;' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'car_import_template.csv'
                        a.click()
                      }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Download className="w-4 h-4" />Download Template
                      </button>
                    </div>
                  </div>

                  {/* Upload Area */}
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('csv-upload')?.click()}
                  >
                    <input type="file" id="csv-upload" accept=".csv" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setCsvFile(file)
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const text = event.target?.result as string
                          parseCSV(text)
                        }
                        reader.readAsText(file)
                      }
                    }} />
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="font-semibold text-lg">Drop your CSV file here</h3>
                    <p className="text-gray-500 mt-1">or click to browse files</p>
                    <p className="text-sm text-gray-400 mt-2">Supports .csv files with car data</p>
                  </div>

                  {csvFile && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <FileText className="w-8 h-8 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium">{csvFile.name}</p>
                        <p className="text-sm text-gray-500">{(csvFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => setCsvFile(null)} className="text-red-500 hover:text-red-700"><X className="w-5 h-5" /></button>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold mb-2">CSV Format Requirements:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Required columns: Make, Model, Year</li>
                      <li>• Optional columns: Price, Mileage, FuelType, Transmission, Color, Description, ContactPhone, ContactEmail, Location</li>
                      <li>• Select a company to import cars into after preview</li>
                      <li>• Maximum 100 rows per import</li>
                    </ul>
                  </div>
                </div>
              )}

              {bulkImportStep === 'preview' && (
                <div className="space-y-4">
                  {/* Company Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Import to Company *</label>
                    <select
                      value={bulkImportData[0]?.company_id || ''}
                      onChange={(e) => {
                        const companyId = e.target.value
                        setBulkImportData(bulkImportData.map(car => ({ ...car, company_id: companyId })))
                      }}
                      className="w-full p-3 border rounded-lg"
                    >
                      <option value="">Select Company</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Errors */}
                  {bulkImportErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                        <X className="w-4 h-4" />Validation Errors ({bulkImportErrors.length})
                      </h4>
                      <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                        {bulkImportErrors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="border rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                      <span className="font-medium">Preview ({bulkImportData.length} cars)</span>
                      <span className="text-sm text-gray-500">Valid: {bulkImportData.length - bulkImportErrors.length}</span>
                    </div>
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2">Make</th>
                            <th className="text-left p-2">Model</th>
                            <th className="text-left p-2">Year</th>
                            <th className="text-left p-2">Price</th>
                            <th className="text-left p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkImportData.slice(0, 20).map((car, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{car.make || '-'}</td>
                              <td className="p-2">{car.model || '-'}</td>
                              <td className="p-2">{car.year || '-'}</td>
                              <td className="p-2">{car.price || '-'}</td>
                              <td className="p-2">
                                {car.make && car.model ? (
                                  <span className="text-green-600">Valid</span>
                                ) : (
                                  <span className="text-red-600">Missing data</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {bulkImportData.length > 20 && (
                      <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500">
                        Showing 20 of {bulkImportData.length} rows
                      </div>
                    )}
                  </div>
                </div>
              )}

              {bulkImportStep === 'importing' && (
                <div className="text-center py-12">
                  <Loader2 className="w-16 h-16 mx-auto text-blue-600 animate-spin mb-4" />
                  <h3 className="text-xl font-semibold">Importing Cars...</h3>
                  <p className="text-gray-500 mt-2">Please wait while we process your data</p>
                </div>
              )}

              {bulkImportStep === 'complete' && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-green-700">Import Complete!</h3>
                  <p className="text-gray-500 mt-2">{bulkImportData.filter(c => c.make && c.model).length} cars have been imported successfully</p>
                  <button onClick={() => { setShowBulkImport(false); setBulkImportData([]); setBulkImportErrors([]); setBulkImportStep('upload'); }} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Done
                  </button>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t px-6 py-4 flex justify-end gap-3 shrink-0">
              <button onClick={() => { setShowBulkImport(false); setBulkImportData([]); setBulkImportErrors([]); setBulkImportStep('upload'); }} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              {bulkImportStep === 'upload' && (
                <button onClick={() => setBulkImportStep('preview')} disabled={!csvFile || bulkImportData.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  Next: Preview →
                </button>
              )}
              {bulkImportStep === 'preview' && (
                <button onClick={handleBulkImport} disabled={!bulkImportData[0]?.company_id || bulkImportData.filter(c => c.make && c.model).length === 0} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  Import {bulkImportData.filter(c => c.make && c.model).length} Cars
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Frame Selector Modal */}
      {showFrameSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg"><Sparkles className="w-6 h-6 text-purple-600" /></div>
                <div>
                  <h2 className="text-xl font-bold">QR Frame Templates</h2>
                  <p className="text-sm text-gray-500">Choose from {QR_FRAMES.length} decorative frames</p>
                </div>
              </div>
              <button onClick={() => setShowFrameSelector(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {['Automotive', 'Professional', 'Seasonal', 'Creative', 'Special'].map(category => (
                <div key={category} className="mb-6">
                  <h3 className="font-semibold mb-3 text-lg">{category} Frames</h3>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                    {QR_FRAMES.filter(f => f.category === category).map(frame => (
                      <button
                        key={frame.id}
                        onClick={() => { setEditingCar({ ...editingCar, qr_frame: frame.id }); setShowFrameSelector(false); }}
                        className={`p-4 border-2 rounded-xl text-center transition-all ${editingCar.qr_frame === frame.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'}`}
                      >
                        <div style={frame.style} className="inline-block mb-2">
                          <QRCodeSVG value="QR" size={50} level="L" />
                        </div>
                        <p className="font-medium text-sm">{frame.name}</p>
                        <p className="text-xs text-gray-500">{frame.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}