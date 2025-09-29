-- Update services table with the new pricing structure
-- Clear existing services and insert the new ones with proper pricing tiers

-- Delete existing services
DELETE FROM services;

-- Insert the new services with their pricing ranges
INSERT INTO services (name, price) VALUES
('Mixed Wash Dry Fold', 'R170-R470'),
('Colour Separated Wash Dry Fold', 'R230-R530'),
('Mixed Wash Dry Iron', 'R230-R600'),
('Colour Separated Wash Dry Iron', 'R280-R660');

-- Add comment to document the pricing structure
COMMENT ON TABLE services IS 'Laundry services with weight-based pricing tiers:
- Mixed Wash Dry Fold: 0-5kg=R170, 6-10kg=R300, 11-15kg=R470
- Colour Separated Wash Dry Fold: 0-5kg=R230, 6-10kg=R360, 11-15kg=R530
- Mixed Wash Dry Iron: 0-5kg=R230, 6-10kg=R380, 11-15kg=R600
- Colour Separated Wash Dry Iron: 0-5kg=R280, 6-10kg=R440, 11-15kg=R660';
