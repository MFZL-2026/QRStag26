# Car QR Showcase - Project Summary

## Project Overview

**Car QR Showcase** is a web-based car dealership management system with QR code functionality for car marketing and customer engagement.

### Purpose
- Allow car dealerships to manage their inventory and generate QR codes for each vehicle
- Customers scan QR codes on car windshields to view detailed car information
- Track customer engagement through scan statistics
- Generate reports on marketing performance

---

## Features Implemented

### 1. Company Management
- Add, edit, delete companies
- Store company details: name, address, phone, email
- View all companies with car count and scan statistics

### 2. Car Inventory Management
- Add, edit, delete cars per company
- Car details: make, model, year, price, mileage, color, fuel type, transmission
- Support for up to 10 photos per car (upload or URL)
- Contact information for inquiries (phone, email)
- Location and description fields

### 3. QR Code System
- Unique QR codes generated for each car
- QR codes link to public car detail pages
- Printable barcode labels for car windshields
- Individual print button on car details view

### 4. Public Car View (Scanning)
- When customers scan QR code, they see:
  - Car photos in grid layout (clickable for lightbox)
  - Full car details (price, mileage, color, specs)
  - Company information
  - Call and email buttons
  - No admin controls shown (clean public view)

### 5. Scan Tracking
- Automatic scan recording when QR is accessed
- Track scan date/time for each car
- Calculate total scans per car and company

### 6. Reports
- Detailed scan reports per company
- Shows total cars, total scans, average scans per car
- Individual car scan history with timestamps
- Printable report format

---

## Technology Stack

### Frontend
- **React** (TypeScript) - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **QRCode.React** - QR code generation

### Backend (Cloud)
- **Supabase** - Cloud database
  - Supabase URL: `https://uifcfnkbccluhyryywxe.supabase.co`
  - Tables: `companies`, `cars`, `scan_records`

### Data Storage
- **Local Storage** - Admin password, login state
- **Supabase** - Companies, cars, scan records

---

## Database Schema

### Companies Table
```
id (text, primary key)
name (text)
address (text)
phone (text)
email (text)
created_at (timestamp)
```

### Cars Table
```
id (text, primary key)
company_id (text, foreign key)
make (text)
model (text)
year (number)
price (text)
mileage (text)
fuelType (text)
transmission (text)
color (text)
description (text)
contactPhone (text)
contactEmail (text)
location (text)
images (text array)
created_at (timestamp)
```

### Scan Records Table
```
id (text, primary key)
car_id (text, foreign key)
scanned_at (timestamp)
```

---

## How to Use

### Admin Panel
1. **Login**: Enter password to access admin panel
2. **First Use**: Set up password (minimum 4 characters)
3. **Add Company**: Click "Add New Company" button
4. **Add Cars**: Expand company, click "Add Car"
5. **View QR**: Each car card shows QR code
6. **Print Barcode**: View car details → click "Print Barcode"
7. **Generate Report**: Expand company → click "View Report"

### Customer Experience
1. Customer scans QR code on car windshield
2. Opens public car detail page: `?car={car_id}`
3. Views car photos, specs, price, contact info
4. Can call or email dealer directly
5. Scan is automatically recorded

---

## File Structure

```
/workspace/car-qr-showcase/
├── src/
│   ├── App.tsx          # Main application code
│   ├── lib/
│   │   └── supabase.ts  # Supabase client configuration
│   ├── main.tsx         # React entry point
│   └── index.css        # Tailwind CSS imports
├── public/
│   └── check-db.html    # Database checker tool
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Deployment

The application is deployed at: **https://p2wg94li4by3.space.minimax.io**

### To run locally:
```bash
cd /workspace/car-qr-showcase
npm install
npm run dev
```

### To build for production:
```bash
npm run build
```

---

## Key URL Patterns

- **Admin Panel**: Main URL (requires password)
- **Public Car View**: `?car={car_id}`
  - Example: `https://p2wg94li4by3.space.minimax.io/?car=abc123`
- **Database Checker**: `/check-db.html`

---

## Security Notes

- RLS (Row Level Security) is disabled on Supabase tables
- Admin password stored in browser localStorage
- No server-side authentication
- Public car view is accessible without password

---

## Future Improvements (Suggestions)

1. User authentication system
2. Multi-user support with roles
3. Email notifications on new scans
4. Export reports to PDF
5. Batch QR code printing
6. Image gallery with carousel
7. Video support for car tours
8. WhatsApp integration
9. SMS notifications
10. Analytics dashboard

---

## Support

For technical issues, check the Supabase dashboard at:
`https://supabase.com/dashboard`

Database project: `uifcfnkbccluhyryywxe`