-- Check the cars table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cars' 
ORDER BY ordinal_position;
