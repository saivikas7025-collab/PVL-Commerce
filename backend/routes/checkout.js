const express = require('express');
const router = express.Router();
const engine = require('../services/pricingEngine');

// POST /api/checkout/calculate
router.post('/calculate', async (req, res) => {
  try {
    const result = await engine.calculateCheckout(req.body || {});
    // Strip internal paise values from the response
    delete result._raw_paise;
    return res.json(result);
  } catch (e) {
    console.error('[checkout/calculate]', e.message);
    return res.status(400).json({ success: false, message: e.message });
  }
});

// GET /api/checkout/config — used by the customer app to display thresholds
router.get('/config', async (req, res) => {
  try {
    const { config, slabs } = await engine.getConfig();
    return res.json({
      success: true,
      config: {
        handling_fee_type: config.handling_fee_type,
        handling_fee_value: Number(config.handling_fee_value),
        platform_fee_enabled: config.platform_fee_enabled,
        platform_fee_value: Number(config.platform_fee_value),
        tax_percent: Number(config.tax_percent),
        free_delivery_threshold: Number(config.free_delivery_threshold),
        min_order_amount: Number(config.min_order_amount),
      },
      slabs,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
