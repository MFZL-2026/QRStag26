import React, { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { createClient } from '@supabase/supabase-js'
import { Phone, Mail, Sparkles, X, ChevronLeft, ChevronRight, Download, AlertCircle, MessageCircle, Video, Printer } from 'lucide-react'

// Supabase client
const supabaseUrl = 'https://uifcfnkbccluhyryywxe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZmNmbmtiY2NsdWh5cnl5d3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDk4ODMsImV4cCI6MjA5Mjg4NTg4M30.c0jZTMmLCW5kNqyWyufHMzObs1pUYskSw1w4VrWTVdU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36)

// Types
type LeadInterest = 'urgent' | 'normal'

interface Car {
  id: string
  company_id: string
  make: string
  model: string
  year: number
  price: string
  mileage: string
  color: string
  fuelType: string
  transmission: string
  description: string
  location: string
  images: string[]
  contactPhone: string
  contactEmail: string
  contactWhatsApp: string
  videoLink: string
  qr_template: string
  qr_frame: string | null
  qr_shape: string
  logo_position: 'center' | 'top' | 'bottom'
  company_name_position: 'top' | 'bottom' | 'none'
  expiry_date: string
  start_date: string
  is_active: boolean
  scan_start_date: string
  scan_end_date: string
  scan_count: number
}

interface Company {
  id: string
  name: string
  branding_logo: string
}

interface Lead {
  id?: number
  car_id: string
  name: string
  phone: string
  email: string
  interest_level: LeadInterest
  notes: string
  created_at?: string
}

interface AppSettings {
  appName: string
  appLogo: string
}

// QR Templates
const qrTemplates = [
  { id: 'default', name: 'Classic', fgColor: '#000000', bgColor: '#ffffff' },
  { id: 'gradient-blue', name: 'Gradient Blue', gradient: ['#667eea', '#764ba2'] },
  { id: 'gradient-green', name: 'Nature Green', gradient: ['#11998e', '#38ef7d'] },
  { id: 'warm-orange', name: 'Warm Orange', gradient: ['#f12711', '#f5af19'] },
  { id: 'elegant-dark', name: 'Elegant Dark', fgColor: '#ffffff', bgColor: '#1a1a2e' },
  { id: 'sunset-pink', name: 'Sunset Pink', gradient: ['#ee0979', '#ff6a00'] },
  { id: 'ocean-blue', name: 'Ocean Blue', gradient: ['#1e3c72', '#2a5298'] },
]

// QR Frames - decorative frame styles
const QR_FRAMES: { id: string; name: string; style: React.CSSProperties }[] = [
  { id: 'auto_1', name: 'Showroom Elite', style: { border: '4px solid #1e3a5f', borderRadius: '12px', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '12px' } },
  { id: 'auto_2', name: 'Racing Stripes', style: { border: '4px solid #dc2626', borderRadius: '8px', background: '#0f172a', padding: '12px', boxShadow: '0 0 20px rgba(220,38,38,0.3)' } },
  { id: 'auto_3', name: 'Luxury Gold', style: { border: '4px solid #f59e0b', borderRadius: '16px', background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)', padding: '12px', boxShadow: '0 0 15px rgba(245,158,11,0.3)' } },
  { id: 'auto_4', name: 'Electric Future', style: { border: '4px solid #10b981', borderRadius: '8px', background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)', padding: '12px' } },
  { id: 'auto_5', name: 'Midnight Blue', style: { border: '4px solid #3b82f6', borderRadius: '12px', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', padding: '12px' } },
  { id: 'pro_1', name: 'Corporate Blue', style: { border: '3px solid #2563eb', borderRadius: '4px', background: '#eff6ff', padding: '8px' } },
  { id: 'pro_2', name: 'Executive Black', style: { border: '3px solid #1f2937', borderRadius: '0px', background: '#f9fafb', padding: '8px' } },
  { id: 'pro_3', name: 'Modern Gray', style: { border: '2px solid #6b7280', borderRadius: '24px', background: '#f3f4f6', padding: '10px' } },
  { id: 'pro_4', name: 'Tech Silver', style: { border: '2px solid #9ca3af', borderRadius: '8px', background: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)', padding: '10px' } },
  { id: 'pro_5', name: 'Enterprise Navy', style: { border: '4px solid #1e40af', borderRadius: '0px', background: '#dbeafe', padding: '8px' } },
  { id: 'season_1', name: 'Holiday Red', style: { border: '4px solid #dc2626', borderRadius: '12px', background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', padding: '12px' } },
  { id: 'season_2', name: 'Holiday Gold', style: { border: '3px solid #f59e0b', borderRadius: '50%', background: '#fffbeb', padding: '10px' } },
  { id: 'season_3', name: 'Spring Green', style: { border: '3px solid #22c55e', borderRadius: '16px', background: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)', padding: '10px' } },
  { id: 'season_4', name: 'Summer Blue', style: { border: '4px solid #0ea5e9', borderRadius: '8px', background: 'linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 100%)', padding: '12px' } },
  { id: 'season_5', name: 'Winter White', style: { border: '2px solid #94a3b8', borderRadius: '24px', background: '#f8fafc', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' } },
  { id: 'creative_1', name: 'Neon Glow', style: { border: '3px solid #a855f7', borderRadius: '12px', background: '#0f172a', padding: '12px', boxShadow: '0 0 25px rgba(168,85,247,0.5)' } },
  { id: 'creative_2', name: 'Gradient Pop', style: { border: '4px solid transparent', borderRadius: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)', padding: '12px' } },
  { id: 'creative_3', name: 'Retro Vintage', style: { border: '4px double #92400e', borderRadius: '0px', background: '#fef3c7', padding: '12px' } },
  { id: 'creative_4', name: 'Minimal Art', style: { border: '1px solid #d1d5db', borderRadius: '0px', background: '#ffffff', padding: '16px' } },
  { id: 'creative_5', name: 'Bold Outline', style: { border: '6px solid #000000', borderRadius: '4px', background: '#ffffff', padding: '8px' } },
  { id: 'special_1', name: 'Grand Opening', style: { border: '5px solid #f59e0b', borderRadius: '0px', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', padding: '10px' } },
  { id: 'special_2', name: 'Anniversary', style: { border: '4px solid #ec4899', borderRadius: '50%', background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', padding: '10px' } },
  { id: 'special_3', name: 'Flash Sale', style: { border: '4px solid #ef4444', borderRadius: '8px', background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', padding: '12px', animation: 'pulse 2s infinite' } },
  { id: 'special_4', name: 'VIP Exclusive', style: { border: '4px solid #7c3aed', borderRadius: '16px', background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)', padding: '12px', boxShadow: '0 0 20px rgba(124,58,237,0.4)' } },
  { id: 'special_5', name: 'Eco Friendly', style: { border: '4px solid #22c55e', borderRadius: '50%', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '12px' } },
]

// QR Shapes - different border radius styles
const QR_SHAPES: { id: string; borderRadius: string }[] = [
  { id: 'square', borderRadius: '0px' },
  { id: 'rounded_sm', borderRadius: '8px' },
  { id: 'rounded_md', borderRadius: '16px' },
  { id: 'rounded_lg', borderRadius: '24px' },
  { id: 'circle', borderRadius: '50%' },
  { id: 'diamond', borderRadius: '4px' },
  { id: 'hexagon', borderRadius: '12px' },
]

// Helper functions
const getGradientId = (templateId: string) => `gradient-${templateId}`

const isTemplateWithGradient = (template: typeof qrTemplates[0]): template is typeof qrTemplates[number] & { gradient: string[] } => 'gradient' in template

export default function CustomerApp() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [car, setCar] = useState<Car | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [currentImage, setCurrentImage] = useState(0)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadSaved, setLeadSaved] = useState(false)
  const [appName, setAppName] = useState('Car Showcase')
  const [appLogo, setAppLogo] = useState('')
  const [qrBaseUrl, setQrBaseUrl] = useState('')
  const qrRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  const [leadForm, setLeadForm] = useState<Lead>({
    car_id: '',
    name: '',
    phone: '',
    email: '',
    interest_level: 'normal',
    notes: ''
  })

  // Get car ID from URL
  const getCarIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search)
    return params.get('car')
  }

  // Load app settings from Supabase and localStorage
  useEffect(() => {
    const loadSettings = async () => {
      // First check localStorage for quick load
      const savedSettings = localStorage.getItem('appSettings')
      if (savedSettings) {
        const settings: AppSettings = JSON.parse(savedSettings)
        if (settings.appName) setAppName(settings.appName)
        if (settings.appLogo) setAppLogo(settings.appLogo)
      }

      // Then fetch from Supabase for latest cloud settings
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .eq('id', 'app_settings')
          .single()

        if (data && !error) {
          if (data.app_name) setAppName(data.app_name)
          if (data.app_logo) setAppLogo(data.app_logo)

          // Update localStorage with latest
          localStorage.setItem('appSettings', JSON.stringify({
            appName: data.app_name || appName,
            appLogo: data.app_logo || ''
          }))
        }
      } catch (err) {
        console.error('Error fetching app settings:', err)
      }
    }

    loadSettings()
    setQrBaseUrl(window.location.origin + window.location.pathname.replace('index-customer.html', '').replace('customer.html', ''))
  }, [])

  // Fetch car and company data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const carId = getCarIdFromUrl()

        if (!carId) {
          setError('No car ID provided')
          return
        }

        // Fetch car data
        const { data: carData, error: carError } = await supabase
          .from('cars')
          .select('*')
          .eq('id', carId)
          .single()

        if (carError || !carData) {
          setError('Car not found')
          return
        }

        // Parse images
        let parsedImages: string[] = []
        if (carData.images) {
          try {
            parsedImages = typeof carData.images === 'string' ? JSON.parse(carData.images) : carData.images
          } catch {
            parsedImages = []
          }
        }

        // Map database snake_case fields to interface camelCase fields
        const car: Car = {
          id: carData.id,
          company_id: carData.company_id,
          make: carData.make,
          model: carData.model,
          year: carData.year,
          price: carData.price || '',
          mileage: carData.mileage || '',
          fuelType: carData.fuel_type || carData.fuelType || '',
          transmission: carData.transmission || '',
          color: carData.color || '',
          description: carData.description || '',
          location: carData.location || '',
          images: parsedImages,
          contactPhone: carData.contact_phone || carData.contactPhone || '',
          contactEmail: carData.contact_email || carData.contactEmail || '',
          contactWhatsApp: carData.contact_whatsapp || carData.contactWhatsApp || '',
          videoLink: carData.video_link || carData.videoLink || '',
          qr_template: carData.qr_template || 'default',
          qr_frame: carData.qr_frame || null,
          qr_shape: carData.qr_shape || 'square',
          logo_position: carData.logo_position || 'center',
          company_name_position: carData.company_name_position || 'top',
          expiry_date: carData.expiry_date || '',
          start_date: carData.start_date || '',
          is_active: carData.is_active ?? true,
          scan_start_date: carData.scan_start_date || '',
          scan_end_date: carData.scan_end_date || '',
          scan_count: carData.scan_count || 0
        }

        setCar(car)
        setImages(parsedImages)
        setLeadForm(prev => ({ ...prev, car_id: carId }))

        // Fetch company data
        if (carData.company_id) {
          const { data: companyData } = await supabase
            .from('company')
            .select('*')
            .eq('id', carData.company_id)
            .single()

          if (companyData) {
            setCompany(companyData as Company)
          }
        }

        // Record scan - run in background (non-blocking) for faster page load
        const scanKey = `scanned_${carId}`
        if (!sessionStorage.getItem(scanKey)) {
          sessionStorage.setItem(scanKey, 'true')
          // Fire and forget - don't await to speed up page load
          supabase
            .from('scan_records')
            .insert([{
              id: generateId(),
              car_id: carId,
              scanned_at: new Date().toISOString()
            }])
            .then(({ error }) => {
              if (error) console.error('Error recording scan:', error)
              else console.log('Scan recorded for car:', carId)
            })
          // Update scan count asynchronously
          supabase
            .from('cars')
            .update({ scan_count: (carData.scan_count || 0) + 1 })
            .eq('id', carId)
        }

      } catch (err) {
        console.error('Error:', err)
        setError('Failed to load car data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Save lead
  const saveLead = async () => {
    if (!leadForm.name.trim()) {
      alert('Please enter your name')
      return
    }

    // Validate car_id
    if (!leadForm.car_id) {
      console.error('Car ID is missing')
      alert('Error: Car ID is missing. Please refresh the page.')
      return
    }

    setSaving(true)
    try {
      const leadData = {
        id: generateId(),
        car_id: leadForm.car_id,
        name: leadForm.name.trim(),
        phone: leadForm.phone?.trim() || null,
        email: leadForm.email?.trim() || null,
        interest_level: leadForm.interest_level,
        notes: leadForm.notes?.trim() || null
      }

      console.log('Submitting lead:', leadData)

      const { data, error: leadError } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single()

      if (leadError) {
        console.error('Lead error:', leadError)
        alert('Failed to submit: ' + leadError.message)
        return
      }

      console.log('Lead saved successfully:', data)
      setLeadSaved(true)
      // Auto close after 3 seconds
      setTimeout(() => {
        setShowLeadForm(false)
        setLeadSaved(false)
        setLeadForm({ car_id: car?.id || '', name: '', phone: '', email: '', interest_level: 'normal', notes: '' })
      }, 3000)
    } catch (err) {
      console.error('Error saving lead:', err)
      alert('Failed to submit. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Get current template
  const getCurrentTemplate = () => {
    const templateId = car?.qr_template || 'default'
    return qrTemplates.find(t => t.id === templateId) || qrTemplates[0]
  }

  // Get template colors for QR code
  const getTemplateColors = () => {
    const template = qrTemplates.find(t => t.id === car?.qr_template) || qrTemplates[0]
    if (template.gradient) {
      return { fg: template.gradient[0], bg: '#ffffff' }
    }
    return { fg: template.fgColor || '#000000', bg: template.bgColor || '#ffffff' }
  }

  // Use html2canvas to capture the actual DOM element with all CSS effects
  const renderQRToCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!qrRef.current) return null

    try {
      const canvas = await html2canvas(qrRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false
      })
      return canvas
    } catch (error) {
      console.error('Error capturing QR element:', error)
      return null
    }
  }

  // Download QR with Frame and Shape
  const downloadQR = async () => {
    if (!car) return
    try {
      const canvas = await renderQRToCanvas()
      if (!canvas) {
        alert('Error generating QR code')
        return
      }
      const link = document.createElement('a')
      link.download = `qr-${car.make}-${car.model}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error downloading QR:', error)
      alert('Error downloading QR code')
    }
  }

  // Print QR with Frame and Shape
  const printQR = async () => {
    if (!car) return
    try {
      const canvas = await renderQRToCanvas()
      if (!canvas) {
        alert('Error generating QR code for print')
        return
      }

      // Open print window with QR image
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow popups to print')
        return
      }

      const imgDataUrl = canvas.toDataURL('image/png')
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print QR Code</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 20px;
            }
            .qr-image {
              max-width: 300px;
              height: auto;
            }
            .car-info {
              margin-top: 15px;
              font-size: 16px;
              color: #333;
            }
            @media print {
              body { margin: 0; }
              .qr-container { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${imgDataUrl}" class="qr-image" alt="QR Code" />
            <div class="car-info">
              <strong>${car?.year} ${car?.make} ${car?.model}</strong>
              ${car?.price ? `<br/><span style="color: #2563eb; font-size: 20px;">${car.price}</span>` : ''}
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
        </html>
      `)
      printWindow.document.close()
    } catch (error) {
      console.error('Error printing QR:', error)
      alert('Error printing QR code')
    }
  }

  // Check if QR is active
  const isQRActive = () => {
    if (!car) return false
    if (car.is_active === false) return false

    const now = new Date()
    const start = car.scan_start_date ? new Date(car.scan_start_date) : null
    const end = car.scan_end_date ? new Date(car.scan_end_date) : null
    if (start && now < start) return false
    if (end && now > end) return false
    return true
  }

  // Get QR timeframe status
  const getQRTimeframeStatus = () => {
    if (!car) return ''
    const now = new Date()
    const start = car.scan_start_date ? new Date(car.scan_start_date) : null
    const end = car.scan_end_date ? new Date(car.scan_end_date) : null
    if (!start && !end) return 'Active'
    if (start && now < start) return `Starts ${car.scan_start_date}`
    if (end && now > end) return 'Expired'
    return 'Active'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading car details...</p>
        </div>
      </div>
    )
  }

  if (error || !car) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Car Not Found</h2>
          <p className="text-gray-600">{error || 'This QR code is invalid or has been removed.'}</p>
        </div>
      </div>
    )
  }

  const templateColors = getTemplateColors()
  const qrUrl = `${qrBaseUrl}index-customer.html?car=${car.id}`
  const isActive = isQRActive()

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      {company && (
        <div className="bg-white shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
            {company.branding_logo && car.logo_position === 'top' && (
              <img src={company.branding_logo} alt="Logo" className="w-10 h-10 object-contain" />
            )}
            <h1 className="text-lg font-semibold text-gray-800">{company.name}</h1>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4">
        {/* QR Not Active Warning */}
        {!isActive && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-red-600 mb-2">QR Code Not Active</h2>
            <p className="text-gray-600">Status: {getQRTimeframeStatus()}</p>
          </div>
        )}

        {/* Car Details Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          {/* Image Gallery */}
          {images.length > 0 && (
            <div className="mb-6">
              <div className="relative rounded-xl overflow-hidden mb-2 bg-gray-100">
                <img
                  src={images[currentImage]}
                  alt={`${car.make} ${car.model}`}
                  className="w-full h-64 object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImage(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentImage(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    onClick={() => setCurrentImage(idx)}
                    className={`w-16 h-16 object-cover rounded-lg cursor-pointer transition flex-shrink-0 ${
                      currentImage === idx ? 'ring-2 ring-blue-500' : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Car Title and Price */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {car.year} {car.make} {car.model}
            </h1>
            {car.price && (
              <p className="text-3xl font-bold text-blue-600">{car.price}</p>
            )}
          </div>

          {/* Car Specs Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {car.mileage && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm mb-1">Mileage</p>
                <p className="font-semibold text-gray-800">{car.mileage}</p>
              </div>
            )}
            {car.color && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm mb-1">Color</p>
                <p className="font-semibold text-gray-800">{car.color}</p>
              </div>
            )}
            {car.fuelType && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm mb-1">Fuel Type</p>
                <p className="font-semibold text-gray-800">{car.fuelType}</p>
              </div>
            )}
            {car.transmission && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm mb-1">Transmission</p>
                <p className="font-semibold text-gray-800">{car.transmission}</p>
              </div>
            )}
            {car.location && (
              <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                <p className="text-gray-500 text-sm mb-1">Location</p>
                <p className="font-semibold text-gray-800">{car.location}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {car.description && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">{car.description}</p>
            </div>
          )}

          {/* Contact Buttons */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {car.contactPhone && (
              <a
                href={`tel:${car.contactPhone}`}
                className="flex flex-col items-center gap-1 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
              >
                <Phone className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-700 text-sm">Call</span>
              </a>
            )}
            {car.contactWhatsApp && (() => {
              // Extract only digits and remove international prefixes (00 or +)
              let phoneNumber = car.contactWhatsApp.replace(/\D/g, '')
              // Remove leading 00 or + for wa.me format
              if (phoneNumber.startsWith('00')) {
                phoneNumber = phoneNumber.substring(2)
              } else if (phoneNumber.startsWith('0') && phoneNumber.length > 10) {
                // If starts with single 0 but is a long number, remove the leading 0
                // This handles cases like 0968 -> 968
                phoneNumber = phoneNumber.substring(1)
              }
              const message = `Hi, I'm interested in your ${car.year} ${car.make} ${car.model}`
              const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
              return (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition"
                >
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-700 text-sm">WhatsApp</span>
                </a>
              )
            })()}
            {car.contactEmail && (
              <a
                href={`mailto:${car.contactEmail}?subject=Inquiry about ${car.year} ${car.make} ${car.model}`}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition"
              >
                <Mail className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700 text-sm">Email</span>
              </a>
            )}
          </div>

          {/* Video Button */}
          {car.videoLink && (
            <a
              href={car.videoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-3 bg-red-50 hover:bg-red-100 rounded-xl transition mb-4"
            >
              <Video className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-700 text-sm">Watch Video</span>
            </a>
          )}

          {/* Interested Button */}
          <button
            onClick={() => setShowLeadForm(true)}
            disabled={!isActive}
            className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${
              isActive
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            I'm Interested - Contact Me
          </button>
        </div>

        {/* QR Code Card (for printing/saving) */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6" style={{ background: templateColors.bg }}>
          <div className="text-center">
            {/* Logo at center */}
            {car.logo_position === 'center' && company?.branding_logo && (
              <div className="mb-4">
                <img src={company.branding_logo} alt="Logo" className="w-20 h-20 object-contain mx-auto" />
              </div>
            )}

            {/* QR Code - with Frame and Shape */}
            <div
              ref={qrRef}
              className="inline-block shadow-lg"
              style={{
                ...(car.qr_frame ? QR_FRAMES.find(f => f.id === car.qr_frame)?.style : { background: '#ffffff', padding: '12px' }),
                borderRadius: QR_SHAPES.find(s => s.id === car.qr_shape)?.borderRadius || '8px',
              }}
            >
              <div style={{
                background: '#ffffff',
                padding: '12px',
                borderRadius: QR_SHAPES.find(s => s.id === car.qr_shape)?.borderRadius || '8px',
                overflow: 'hidden'
              }}>
                <QRCodeSVG
                  value={qrUrl}
                  size={200}
                  level="H"
                  fgColor={templateColors.fg}
                  bgColor="#ffffff"
                />
              </div>
            </div>

            {/* Save and Print QR buttons */}
            <div className="flex justify-center gap-3 mt-4">
              <button onClick={downloadQR} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition">
                <Download className="w-4 h-4" /> Save QR
              </button>
              <button onClick={printQR} className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition">
                <Printer className="w-4 h-4" /> Print QR
              </button>
            </div>

            {/* Car title under QR */}
            <h2 className="text-xl font-bold mt-4" style={{ color: templateColors.fg }}>
              {car.year} {car.make} {car.model}
            </h2>
            {car.price && (
              <p className="text-2xl font-bold mt-2" style={{ color: templateColors.fg === '#ffffff' ? '#ffd700' : '#2563eb' }}>
                {car.price}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        {car.company_name_position === 'bottom' && company && (
          <div className="flex items-center justify-center gap-3 bg-white rounded-2xl shadow-lg p-6 mb-6">
            {company.branding_logo && car.logo_position === 'bottom' && (
              <img src={company.branding_logo} alt="Logo" className="w-12 h-12 object-contain" />
            )}
            <p className="text-lg font-semibold text-gray-700">{company.name}</p>
          </div>
        )}

        {/* Powered by footer */}
        <footer className="text-center py-6 text-gray-500 text-sm">
          <p>Powered by {appName}</p>
        </footer>
      </div>

      {/* Lead Form Modal */}
      {showLeadForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            {leadSaved ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-green-600 mb-2">Thank You!</h3>
                <p className="text-gray-600">We'll contact you soon.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">I'm Interested</h2>
                  <button
                    onClick={() => setShowLeadForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Your Name *</label>
                    <input
                      type="text"
                      value={leadForm.name}
                      onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="+1 555-123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={leadForm.email}
                      onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Interest Level</label>
                    <div className="flex gap-2">
                      {(['urgent', 'normal'] as LeadInterest[]).map((level) => (
                        <button
                          key={level}
                          onClick={() => setLeadForm({ ...leadForm, interest_level: level })}
                          className={`flex-1 py-3 rounded-lg capitalize font-medium transition ${
                            leadForm.interest_level === level
                              ? level === 'urgent'
                                ? 'bg-red-500 text-white'
                                : 'bg-blue-500 text-white'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                      value={leadForm.notes}
                      onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                      className="w-full p-3 border rounded-lg h-20 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Any questions or notes..."
                    />
                  </div>

                  <button
                    onClick={saveLead}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Submit Interest
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}