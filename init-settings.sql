-- Initialize app_settings table with default values
INSERT INTO app_settings (id, app_name, app_logo, app_description, primary_color, secondary_color, updated_at)
VALUES (
  'app_settings',
  'Car QR Showcase',
  '',
  'QR Code Management for Car Dealerships',
  '#3b82f6',
  '#1e40af',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
