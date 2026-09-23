router.post("/register", async (req, res) => {
  try {
    const {
      idToken,
      legalName, ownerName, businessType,
      pan, gstin, fssaiLicense,
      name, phone, altPhone, email,
      address, city, state, pincode,
      latitude, longitude,
      deliveryRadiusKm,
      openingTime, closingTime, prepTimeMinutes,
      categories,
      bankHolderName, bankName, bankAccountNo, bankIFSC, upiId,
      documents,
      password,
    } = req.body || {};

    const { verifyIdToken } = require('../services/firebaseAuth');
    const decoded = await verifyIdToken(idToken);
    const googleEmail = (decoded.email || '').trim().toLowerCase();
    if (!googleEmail) {
      return res.status(400).json({ success: false, message: 'Google account has no email' });
    }

    const existing = await pool.query(
      `SELECT id, approval_status FROM stores WHERE LOWER(email) = $1 LIMIT 1`,
      [googleEmail]
    );
    if (existing.rowCount > 0) {
      return res.status(200).json({
        success: false,
        already_registered: true,
        storeId: existing.rows[0].id,
        message: 'A store is already registered with this Google account.',
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Store display name is required' });
    }
    if (!ownerName || !ownerName.trim()) {
      return res.status(400).json({ success: false, message: 'Owner name is required' });
    }
    if (!pan || !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan.trim())) {
      return res.status(400).json({ success: false, message: 'Valid PAN is required' });
    }
    if (!phone || phone.length < 10) {
      return res.status(400).json({ success: false, message: 'Valid phone is required' });
    }
    if (!bankAccountNo || !bankIFSC) {
      return res.status(400).json({ success: false, message: 'Bank account and IFSC are required' });
    }

    const ins = await pool.query(
      `INSERT INTO stores
         (name, legal_name, owner_name, business_type,
          pan, gstin, fssai_license,
          phone, alt_phone, email, password,
          address, city, state, pincode,
          latitude, longitude, delivery_radius_km,
          opening_time, closing_time, prep_time_minutes,
          categories,
          bank_holder_name, bank_name, bank_account_no, bank_ifsc, upi_id,
          firebase_uid,
          is_active, is_online, approval_status)
       VALUES
         ($1,$2,$3,$4,
          $5,$6,$7,
          $8,$9,$10,$11,
          $12,$13,$14,$15,
          $16,$17,$18,
          $19,$20,$21,
          $22::text[],
          $23,$24,$25,$26,$27,
          $28,
          FALSE, FALSE, 'pending')
       RETURNING id`,
      [
        name.trim(), legalName || name.trim(), ownerName.trim(), businessType || 'proprietorship',
        pan.trim().toUpperCase(), gstin || null, fssaiLicense || null,
        phone.trim(), altPhone || null, googleEmail, password || null,
        address || null, city || null, state || null, pincode || null,
        latitude || null, longitude || null, deliveryRadiusKm || 5,
        openingTime || null, closingTime || null, prepTimeMinutes || 15,
        Array.isArray(categories) && categories.length ? categories : ['Grocery'],
        bankHolderName || ownerName.trim(), bankName || null, bankAccountNo.trim(), bankIFSC.trim().toUpperCase(), upiId || null,
        decoded.uid,
      ]
    );
    const storeId = ins.rows[0].id;

    if (Array.isArray(documents) && documents.length) {
      for (const d of documents) {
        if (!d || !d.docType || !d.docUrl) continue;
        await pool.query(
          `INSERT INTO store_documents (store_id, doc_type, doc_url) VALUES ($1, $2, $3)`,
          [storeId, String(d.docType).slice(0, 40), String(d.docUrl)]
        );
      }
    }

    await pool.query(
      `INSERT INTO store_approval_history (store_id, action, from_status, to_status, actor, note)
       VALUES ($1, 'SUBMITTED', NULL, 'pending', $2, 'New store application submitted')`,
      [storeId, googleEmail]
    );

    return res.json({
      success: true,
      pending: true,
      storeId,
      storeName: name.trim(),
      message: 'Application submitted. Awaiting admin review.',
    });
  } catch (e) {
    console.error('STORE REGISTER ERROR:', e);
    return res.status(500).json({ success: false, message: e.message || 'Registration failed' });
  }
});
