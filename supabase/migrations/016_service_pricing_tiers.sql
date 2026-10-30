-- Weight-based price tiers for laundry services.
-- services.price stays a display string such as "R170-R470".

CREATE TABLE IF NOT EXISTS service_pricing_tiers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    min_weight NUMERIC NOT NULL,
    max_weight NUMERIC NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT service_pricing_tiers_price_positive CHECK (price > 0),
    CONSTRAINT service_pricing_tiers_min_weight_non_negative CHECK (min_weight >= 0),
    CONSTRAINT service_pricing_tiers_min_less_than_max CHECK (min_weight < max_weight)
);

CREATE INDEX IF NOT EXISTS service_pricing_tiers_service_id_idx
    ON service_pricing_tiers (service_id);

ALTER TABLE service_pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_pricing_tiers_select" ON service_pricing_tiers
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "service_pricing_tiers_insert" ON service_pricing_tiers
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "service_pricing_tiers_update" ON service_pricing_tiers
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_pricing_tiers_delete" ON service_pricing_tiers
    FOR DELETE
    TO authenticated
    USING (true);

GRANT SELECT ON public.service_pricing_tiers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.service_pricing_tiers TO authenticated;

-- Seed the current hard-coded tiers, matched to services by name.
INSERT INTO service_pricing_tiers (service_id, min_weight, max_weight, price)
SELECT s.id, v.min_weight, v.max_weight, v.price
FROM services s
JOIN (
    VALUES
        ('Mixed Wash Dry Fold', 0, 5, 170.00),
        ('Mixed Wash Dry Fold', 6, 10, 300.00),
        ('Mixed Wash Dry Fold', 11, 15, 470.00),
        ('Colour Separated Wash Dry Fold', 0, 5, 230.00),
        ('Colour Separated Wash Dry Fold', 6, 10, 360.00),
        ('Colour Separated Wash Dry Fold', 11, 15, 530.00),
        ('Mixed Wash Dry Iron', 0, 5, 230.00),
        ('Mixed Wash Dry Iron', 6, 10, 380.00),
        ('Mixed Wash Dry Iron', 11, 15, 600.00),
        ('Colour Separated Wash Dry Iron', 0, 5, 280.00),
        ('Colour Separated Wash Dry Iron', 6, 10, 440.00),
        ('Colour Separated Wash Dry Iron', 11, 15, 660.00)
) AS v(name, min_weight, max_weight, price)
    ON s.name = v.name;

ALTER PUBLICATION supabase_realtime ADD TABLE service_pricing_tiers;

COMMENT ON TABLE service_pricing_tiers IS 'Weight-based price tiers for a laundry service. services.price is the display range derived from these rows.';
