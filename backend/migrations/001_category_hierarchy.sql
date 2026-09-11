BEGIN;

-- ============================================
-- STORE CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS store_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PRODUCT MAIN CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PRODUCT SUBCATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS product_subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL
        REFERENCES product_categories(id)
        ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, name)
);

-- ============================================
-- ADD SUBCATEGORY TO PRODUCTS
-- ============================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS subcategory_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_subcategory_id_fkey'
    ) THEN
        ALTER TABLE products
        ADD CONSTRAINT products_subcategory_id_fkey
        FOREIGN KEY (subcategory_id)
        REFERENCES product_subcategories(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- STORE CATEGORIES
-- ============================================

INSERT INTO store_categories (name)
VALUES
    ('Ice Cream'),
    ('Travel'),
    ('Hobby'),
    ('Sports'),
    ('Spiritual'),
    ('Pet'),
    ('Fashion'),
    ('Toy'),
    ('Book'),
    ('Pharma'),
    ('E-Gifts'),
    ('Jewellery')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PRODUCT MAIN CATEGORIES
-- ============================================

INSERT INTO product_categories (name)
VALUES
    ('Grocery & Kitchen'),
    ('Beauty & Personal Care'),
    ('Snacks & Drinks'),
    ('Electronics'),
    ('Household Essentials'),
    ('Fashion & Accessories')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- GROCERY & KITCHEN
-- ============================================

INSERT INTO product_subcategories (category_id, name)
SELECT pc.id, v.name
FROM product_categories pc
CROSS JOIN (
    VALUES
        ('Vegetables & Fruits'),
        ('Atta, Rice & Dal'),
        ('Oil, Ghee & Masala'),
        ('Dairy, Bread & Eggs'),
        ('Bakery & Biscuits'),
        ('Dry Fruits & Cereals'),
        ('Chicken, Meat & Fish'),
        ('Kitchenware & Appliances')
) AS v(name)
WHERE pc.name = 'Grocery & Kitchen'
ON CONFLICT (category_id, name) DO NOTHING;

-- ============================================
-- BEAUTY & PERSONAL CARE
-- ============================================

INSERT INTO product_subcategories (category_id, name)
SELECT pc.id, v.name
FROM product_categories pc
CROSS JOIN (
    VALUES
        ('Bath & Body'),
        ('Hair Care'),
        ('Skin & Face'),
        ('Beauty & Cosmetics'),
        ('Feminine Hygiene'),
        ('Health & Pharma'),
        ('Sexual Wellness')
) AS v(name)
WHERE pc.name = 'Beauty & Personal Care'
ON CONFLICT (category_id, name) DO NOTHING;

-- ============================================
-- SNACKS & DRINKS
-- ============================================

INSERT INTO product_subcategories (category_id, name)
SELECT pc.id, v.name
FROM product_categories pc
CROSS JOIN (
    VALUES
        ('Chips & Namkeen'),
        ('Sweets & Chocolates'),
        ('Drinks & Juices'),
        ('Tea, Coffee & Milk Drinks'),
        ('Instant Food'),
        ('Sauces & Spreads')
) AS v(name)
WHERE pc.name = 'Snacks & Drinks'
ON CONFLICT (category_id, name) DO NOTHING;

-- ============================================
-- ELECTRONICS
-- ============================================

INSERT INTO product_subcategories (category_id, name)
SELECT pc.id, v.name
FROM product_categories pc
CROSS JOIN (
    VALUES
        ('Mobile Accessories'),
        ('Chargers & Cables'),
        ('Headphones & Speakers'),
        ('Smart Home Devices'),
        ('Power Banks')
) AS v(name)
WHERE pc.name = 'Electronics'
ON CONFLICT (category_id, name) DO NOTHING;

-- ============================================
-- HOUSEHOLD ESSENTIALS
-- ============================================

INSERT INTO product_subcategories (category_id, name)
SELECT pc.id, v.name
FROM product_categories pc
CROSS JOIN (
    VALUES
        ('Cleaners & Repellents'),
        ('Home & Lifestyle'),
        ('Stationery & Games'),
        ('Kitchen Storage')
) AS v(name)
WHERE pc.name = 'Household Essentials'
ON CONFLICT (category_id, name) DO NOTHING;

-- ============================================
-- FASHION & ACCESSORIES
-- ============================================

INSERT INTO product_subcategories (category_id, name)
SELECT pc.id, v.name
FROM product_categories pc
CROSS JOIN (
    VALUES
        ('Men''s Fashion'),
        ('Women''s Fashion'),
        ('Kids'' Fashion'),
        ('Accessories'),
        ('Footwear')
) AS v(name)
WHERE pc.name = 'Fashion & Accessories'
ON CONFLICT (category_id, name) DO NOTHING;

-- ============================================
-- MAP EXISTING LEGACY CATEGORIES
-- ============================================

UPDATE products p
SET subcategory_id = ps.id
FROM categories c
JOIN product_categories pc
    ON (
        (c.name IN ('Fruits', 'Vegetables')
            AND pc.name = 'Grocery & Kitchen')
        OR
        (c.name IN ('Dairy', 'Bakery', 'Eggs', 'Rice & Grains')
            AND pc.name = 'Grocery & Kitchen')
        OR
        (c.name IN ('Beverages', 'Snacks')
            AND pc.name = 'Snacks & Drinks')
        OR
        (c.name = 'Household'
            AND pc.name = 'Household Essentials')
        OR
        (c.name = 'Personal Care'
            AND pc.name = 'Beauty & Personal Care')
    )
JOIN product_subcategories ps
    ON ps.category_id = pc.id
WHERE p.category_id = c.id
AND (
    (c.name IN ('Fruits', 'Vegetables')
        AND ps.name = 'Vegetables & Fruits')
    OR
    (c.name IN ('Dairy', 'Eggs')
        AND ps.name = 'Dairy, Bread & Eggs')
    OR
    (c.name = 'Bakery'
        AND ps.name = 'Bakery & Biscuits')
    OR
    (c.name = 'Rice & Grains'
        AND ps.name = 'Atta, Rice & Dal')
    OR
    (c.name = 'Beverages'
        AND ps.name = 'Drinks & Juices')
    OR
    (c.name = 'Snacks'
        AND ps.name = 'Chips & Namkeen')
    OR
    (c.name = 'Household'
        AND ps.name = 'Cleaners & Repellents')
    OR
    (c.name = 'Personal Care'
        AND ps.name = 'Bath & Body')
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_subcategory_id
ON products(subcategory_id);

CREATE INDEX IF NOT EXISTS idx_product_subcategories_category_id
ON product_subcategories(category_id);

CREATE INDEX IF NOT EXISTS idx_product_categories_active
ON product_categories(is_active);

CREATE INDEX IF NOT EXISTS idx_store_categories_active
ON store_categories(is_active);

COMMIT;
