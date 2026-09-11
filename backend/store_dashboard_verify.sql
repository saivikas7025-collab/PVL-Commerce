SELECT 'products.store_id' AS check_name,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_name='products'
         AND column_name='store_id'
       ) AS exists;

SELECT 'products.approval_status' AS check_name,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_name='products'
         AND column_name='approval_status'
       ) AS exists;

SELECT 'products.store_notes' AS check_name,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_name='products'
         AND column_name='store_notes'
       ) AS exists;

SELECT 'stores.password' AS check_name,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_name='stores'
         AND column_name='password'
       ) AS exists;

SELECT 'stores.delivery_fee' AS check_name,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_name='stores'
         AND column_name='delivery_fee'
       ) AS exists;

SELECT 'stores.min_order' AS check_name,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_name='stores'
         AND column_name='min_order'
       ) AS exists;

SELECT id, name, is_active
FROM stores
ORDER BY id;

SELECT
    COUNT(*) AS total_products,
    COUNT(store_id) AS products_with_store,
    COUNT(*) FILTER (
        WHERE approval_status = 'approved'
    ) AS approved_products,
    COUNT(*) FILTER (
        WHERE approval_status = 'pending'
    ) AS pending_products
FROM products;