const pool = require("../db");

async function getStoreProducts(storeId) {
    const result = await pool.query(`
        SELECT 
            p.id, 
            p.category_id, 
            p.name, 
            p.description, 
            p.unit, 
            p.price, 
            p.original_price, 
            p.image_url, 
            p.is_active, 

            c.name AS category_name,
            pc.id AS main_category_id,
            pc.name AS main_category,
            ps.id AS subcategory_id,
            ps.name AS subcategory,

            COALESCE(i.stock_quantity, 0)::int AS stock_quantity, 
            COALESCE(i.selling_price, p.price)::numeric AS store_selling_price, 
            COALESCE(i.is_available, false) AS is_available 

        FROM products p 

        LEFT JOIN categories c 
            ON c.id = p.category_id 

        LEFT JOIN product_subcategories ps 
            ON ps.id = p.subcategory_id

        LEFT JOIN product_categories pc 
            ON pc.id = ps.category_id

        LEFT JOIN inventory i 
            ON i.product_id = p.id 
            AND i.store_id = $1 

        WHERE p.is_active = true 

        ORDER BY p.id ASC 
    `, [storeId]);

    return result.rows;
}

module.exports = {
    getStoreProducts
};
