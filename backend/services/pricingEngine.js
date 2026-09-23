/**
 * PVL-Commerce Pricing Engine
 * Central, backend-only calculator. Trusts NOTHING from the client except
 * product_id, store_id, and quantity. All money math uses integer paise
 * internally then converts to rupees at the end to avoid float drift.
 */
const { pool } = require('../db');

// ---------- helpers ----------
function paise(n) { return Math.round(Number(n || 0) * 100); }
function rupees(p) { return Math.round(p) / 100; }

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const d2r = (d) => (d * Math.PI) / 180;
  const dLat = d2r(lat2 - lat1);
  const dLng = d2r(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(d2r(lat1)) * Math.cos(d2r(lat2)) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ---------- config ----------
async function getConfig() {
  const { rows: [c] } = await pool.query('SELECT * FROM pricing_config WHERE id=1');
  const { rows: slabs } = await pool.query(
    'SELECT min_km, max_km, delivery_fee FROM delivery_slabs WHERE is_active=true ORDER BY min_km');
  return { config: c, slabs };
}

function deliveryFeeForDistance(km, slabs) {
  for (const s of slabs) {
    if (km >= Number(s.min_km) && km < Number(s.max_km)) return Number(s.delivery_fee);
  }
  // fall back to the last slab's fee
  return slabs.length ? Number(slabs[slabs.length-1].delivery_fee) : 30;
}

function applyFeeRule(type, value, subtotalPaise, minP, maxP) {
  let fee = 0;
  if (type === 'percent') {
    fee = Math.round(subtotalPaise * (Number(value) / 100));
  } else {
    fee = paise(value);
  }
  if (minP > 0 && fee < minP) fee = minP;
  if (maxP > 0 && fee > maxP) fee = maxP;
  return fee;
}

// ---------- main ----------
/**
 * @param {Object} req
 *  {
 *    customer_id?: number,
 *    address_id: number,
 *    items: [{ product_id, store_id, quantity }],
 *    coupon_code?: string
 *  }
 * @returns full price breakdown, ready to display or snapshot
 */
async function calculateCheckout(req) {
  const { customer_id, address_id, items, coupon_code } = req;
  if (!Array.isArray(items) || items.length === 0) throw new Error('No items');
  if (!address_id) throw new Error('address_id required');

  const { config, slabs } = await getConfig();

  // ---------- Address + customer location ----------
  const { rows: [addr] } = await pool.query(
    'SELECT id, latitude, longitude, city, pincode FROM addresses WHERE id=$1', [address_id]);
  if (!addr) throw new Error('Address not found');
  const custLat = Number(addr.latitude);
  const custLng = Number(addr.longitude);

  // ---------- Line items (from DB) ----------
  const lineItems = [];
  let mrpTotalP = 0;
  let itemsTotalP = 0;
  let taxWeightedBaseP = 0; // subtotal base for tax (post-discount, pre-tax)
  let primaryStoreId = null;
  let maxDistanceKm = 0;

  for (const it of items) {
    const qty = Math.max(1, Math.floor(Number(it.quantity) || 0));

    // Fetch product + inventory (store-specific)
    const { rows: [p] } = await pool.query(
      `SELECT p.id, p.name, p.price, p.original_price, p.tax_percent
         FROM products p WHERE p.id=$1`, [it.product_id]);
    if (!p) throw new Error(`Product ${it.product_id} not found`);

    // Store-specific selling price from inventory
    let sellingPrice = Number(p.price || 0);
    let storeId = it.store_id || null;
    if (storeId) {
      const { rows: [inv] } = await pool.query(
        `SELECT stock_quantity, selling_price FROM inventory
          WHERE store_id=$1 AND product_id=$2`, [storeId, p.id]);
      if (inv) {
        if (Number(inv.stock_quantity) < qty) {
          throw new Error(`Insufficient stock for ${p.name}`);
        }
        if (inv.selling_price != null) sellingPrice = Number(inv.selling_price);
      }
    }

    const mrp = Number(p.original_price || sellingPrice);
    const taxPct = Number(p.tax_percent ?? config.tax_percent);

    const lineMrpP = paise(mrp * qty);
    const lineSellP = paise(sellingPrice * qty);
    const lineDiscP = lineMrpP - lineSellP;

    mrpTotalP += lineMrpP;
    itemsTotalP += lineSellP;
    taxWeightedBaseP += lineSellP;

    lineItems.push({
      product_id: p.id,
      name: p.name,
      store_id: storeId,
      quantity: qty,
      mrp: mrp,
      selling_price: sellingPrice,
      line_total: rupees(lineSellP),
      line_discount: rupees(lineDiscP),
      tax_percent: taxPct,
    });

    if (storeId && !primaryStoreId) primaryStoreId = storeId;
  }

  // ---------- Distance (store → customer) ----------
  if (primaryStoreId) {
    const { rows: [s] } = await pool.query(
      'SELECT latitude, longitude FROM stores WHERE id=$1', [primaryStoreId]);
    if (s && s.latitude && s.longitude) {
      maxDistanceKm = haversineKm(
        Number(s.latitude), Number(s.longitude), custLat, custLng);
    }
  }

  // ---------- Handling fee ----------
  const handlingP = applyFeeRule(
    config.handling_fee_type, config.handling_fee_value,
    itemsTotalP, paise(config.handling_fee_min), paise(config.handling_fee_max));

  // ---------- Delivery fee ----------
  let deliveryP = paise(deliveryFeeForDistance(maxDistanceKm, slabs));
  const freeThresholdP = paise(config.free_delivery_threshold);
  const freeDeliveryApplied = itemsTotalP >= freeThresholdP;
  if (freeDeliveryApplied) deliveryP = 0;

  // ---------- Platform fee ----------
  let platformP = 0;
  if (config.platform_fee_enabled) {
    platformP = applyFeeRule(
      config.platform_fee_type, config.platform_fee_value,
      itemsTotalP, paise(config.platform_fee_min), paise(config.platform_fee_max));
  }

  // ---------- Subtotal before coupon ----------
  const subtotalBeforeCouponP = itemsTotalP + handlingP + deliveryP + platformP;

  // ---------- Coupon ----------
  let couponDiscountP = 0;
  let couponInfo = { code: null, discount: 0, valid: false, message: null };
  if (coupon_code) {
    const { rows: [c] } = await pool.query(
      `SELECT * FROM coupons WHERE UPPER(code)=UPPER($1) AND is_active=true LIMIT 1`,
      [coupon_code.trim()]);
    if (!c) {
      couponInfo.message = 'Invalid coupon';
    } else if (c.expires_at && new Date(c.expires_at) < new Date()) {
      couponInfo.message = 'Coupon expired';
    } else if (itemsTotalP < paise(c.minimum_order_amount || 0)) {
      couponInfo.message = `Minimum order ₹${c.minimum_order_amount} required`;
    } else {
      // Usage limits
      let usageOk = true;
      if (c.usage_limit != null && c.used_count >= c.usage_limit) usageOk = false;
      if (usageOk && customer_id) {
        const { rows: [cu] } = await pool.query(
          `SELECT COUNT(*)::int AS n FROM coupon_usage WHERE coupon_id=$1 AND user_id=$2`,
          [c.id, customer_id]);
        if (cu.n > 0) usageOk = false; // simple 1-per-customer rule for now
      }
      if (!usageOk) {
        couponInfo.message = 'Coupon usage limit reached';
      } else {
        let discP = 0;
        if (c.discount_type === 'percent') {
          discP = Math.round(itemsTotalP * (Number(c.discount_value) / 100));
        } else {
          discP = paise(c.discount_value);
        }
        const maxP = paise(c.maximum_discount || 0);
        if (maxP > 0 && discP > maxP) discP = maxP;
        if (discP > itemsTotalP) discP = itemsTotalP;
        couponDiscountP = discP;
        couponInfo = {
          code: c.code,
          discount: rupees(discP),
          valid: true,
          message: null,
        };
      }
    }
  }

  // ---------- Tax (on items after coupon) ----------
  const taxableBaseP = Math.max(0, itemsTotalP - couponDiscountP);
  const taxP = Math.round(taxableBaseP * (Number(config.tax_percent) / 100));

  // ---------- Grand total ----------
  const grandTotalP = Math.max(0,
    itemsTotalP - couponDiscountP + handlingP + deliveryP + platformP + taxP);

  // ---------- Total savings ----------
  const productSavingsP = mrpTotalP - itemsTotalP;
  const deliverySavingsP = freeDeliveryApplied
    ? paise(deliveryFeeForDistance(maxDistanceKm, slabs))
    : 0;
  const totalSavingsP = productSavingsP + couponDiscountP + deliverySavingsP;

  // ---------- Response ----------
  const r2 = rupees;
  const pricing = {
    mrp_total: r2(mrpTotalP),
    product_discount: r2(productSavingsP),
    items_total: r2(itemsTotalP),
    handling_charge: r2(handlingP),
    delivery_charge: r2(deliveryP),
    platform_fee: r2(platformP),
    coupon_discount: r2(couponDiscountP),
    tax: r2(taxP),
    subtotal_before_coupon: r2(subtotalBeforeCouponP),
    total_savings: r2(totalSavingsP),
    grand_total: r2(grandTotalP),
  };

  const delivery = {
    distance_km: Math.round(maxDistanceKm * 100) / 100,
    estimated_minutes: Math.max(10, Math.round(8 + maxDistanceKm * 3)),
    free_delivery_applied: freeDeliveryApplied,
    free_delivery_threshold: Number(config.free_delivery_threshold),
  };

  return {
    success: true,
    pricing,
    delivery,
    coupon: couponInfo,
    items: lineItems,
    config_used: {
      handling_fee_type: config.handling_fee_type,
      handling_fee_value: Number(config.handling_fee_value),
      platform_fee_enabled: config.platform_fee_enabled,
      platform_fee_value: Number(config.platform_fee_value),
      tax_percent: Number(config.tax_percent),
    },
    _raw_paise: {
      mrp_total: mrpTotalP,
      items_total: itemsTotalP,
      handling: handlingP,
      delivery: deliveryP,
      platform: platformP,
      coupon: couponDiscountP,
      tax: taxP,
      grand_total: grandTotalP,
    },
  };
}

async function saveSnapshot(orderId, breakdown, rawPaise) {
  await pool.query(`
    INSERT INTO order_price_breakdown (
      order_id, mrp_total, product_discount, items_total,
      handling_charge, delivery_charge, platform_fee,
      coupon_code, coupon_discount, tax, total_savings, grand_total,
      distance_km, snapshot_json
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (order_id) DO NOTHING
  `, [
    orderId,
    breakdown.pricing.mrp_total,
    breakdown.pricing.product_discount,
    breakdown.pricing.items_total,
    breakdown.pricing.handling_charge,
    breakdown.pricing.delivery_charge,
    breakdown.pricing.platform_fee,
    breakdown.coupon.code || null,
    breakdown.pricing.coupon_discount,
    breakdown.pricing.tax,
    breakdown.pricing.total_savings,
    breakdown.pricing.grand_total,
    breakdown.delivery.distance_km,
    JSON.stringify({ pricing: breakdown.pricing, delivery: breakdown.delivery, coupon: breakdown.coupon, items: breakdown.items }),
  ]);
}

module.exports = {
  calculateCheckout,
  saveSnapshot,
  getConfig,
  haversineKm,
  deliveryFeeForDistance,
};
