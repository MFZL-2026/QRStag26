-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT NOT NULL
);

-- Create scan_records table
CREATE TABLE IF NOT EXISTS scan_records (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  scanned_at TEXT NOT NULL
);

-- Insert sample data for testing
INSERT INTO companies (id, name, address, phone, email, created_at) 
VALUES ('company1', 'Demo Motors', '123 Main St, Los Angeles', '+1 555-123-4567', 'demo@demomotors.com', NOW()::text)
ON CONFLICT (id) DO NOTHING;
