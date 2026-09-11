BEGIN;

-- ----------------------------------------------------------
-- PRODUCTS: STORE OWNERSHIP
-- ----------------------------------------------------------

ALTER TABLE products
ADD COLUMN IF NOT EXISTS store_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_store_id_fkey'
    ) THEN
        ALTER TABLE products
        ADD CONSTRAINT products_store_id_fkey
        FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- ----------------------------------------------------------
-- PRODUCT APPROVAL WORKFLOW
-- ----------------------------------------------------------

ALTER TABLE products
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20)
DEFAULT 'approved';

ALTER TABLE products
ADD COLUMN IF NOT EXISTS store_notes TEXT;

UPDATE products
SET approval_status = 'approved'
WHERE approval_status IS NULL;

-- ----------------------------------------------------------
-- STORE LOGIN
-- ----------------------------------------------------------

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS password TEXT;

-- ----------------------------------------------------------
-- STORE COMMERCIAL SETTINGS
-- ----------------------------------------------------------

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2)
DEFAULT 0;

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS min_order NUMERIC(10,2)
DEFAULT 0;

-- ----------------------------------------------------------
-- EXISTING INVENTORY -> STORE OWNERSHIP
-- Only fills NULL store_id values.
-- Existing product ownership is never overwritten.
-- ----------------------------------------------------------

UPDATE products p
SET store_id = x.store_id
FROM (
    SELECT product_id, MIN(store_id) AS store_id
    FROM inventory
    WHERE store_id IS NOT NULL
    GROUP BY product_id
) x
WHERE p.id = x.product_id
  AND p.store_id IS NULL;

-- ----------------------------------------------------------
-- TEST STORE PASSWORD
-- Only fills missing passwords.
-- ----------------------------------------------------------

UPDATE stores
SET password = '1234'
WHERE password IS NULL;

-- ----------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_products_store_id
ON products(store_id);

CREATE INDEX IF NOT EXISTS idx_products_approval_status
ON products(approval_status);

CREATE INDEX IF NOT EXISTS idx_inventory_store_product
ON inventory(store_id, product_id);

COMMIT;