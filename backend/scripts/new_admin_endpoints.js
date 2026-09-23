/* ==========================================================
   STORE ONBOARDING — ADMIN REVIEW QUEUE
   ========================================================== */

router.get('/store-applications', async (req, res) => {
  const status = String(req.query.status || 'pending');
  try {
    const r = await pool.query(
      `SELECT id, name, legal_name, owner_name, business_type,
              phone, email, city, state,
              categories, approval_status,
              created_at
         FROM stores
        WHERE ($1::text = 'all' OR approval_status = $1)
        ORDER BY created_at DESC
        LIMIT 200`,
      [status]
    );
    return res.json({ success: true, stores: r.rows });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/store-applications/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
  try {
    const store = await pool.query(`SELECT * FROM stores WHERE id = $1`, [id]);
    if (!store.rowCount) return res.status(404).json({ success: false, message: 'Not found' });
    const docs = await pool.query(
      `SELECT id, doc_type, doc_url, uploaded_at FROM store_documents WHERE store_id = $1 ORDER BY id`,
      [id]
    );
    const history = await pool.query(
      `SELECT action, from_status, to_status, actor, note, created_at
         FROM store_approval_history
        WHERE store_id = $1
        ORDER BY id DESC`,
      [id]
    );
    return res.json({
      success: true,
      store: store.rows[0],
      documents: docs.rows,
      history: history.rows,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/store-applications/:id/approve', async (req, res) => {
  const id = Number(req.params.id);
  const actor = String((req.body && req.body.actor) || 'admin');
  try {
    const before = await pool.query(`SELECT approval_status FROM stores WHERE id = $1`, [id]);
    if (!before.rowCount) return res.status(404).json({ success: false, message: 'Not found' });
    await pool.query(
      `UPDATE stores
          SET approval_status = 'approved',
              is_active = TRUE,
              approved_at = now(),
              approved_by = $1
        WHERE id = $2`,
      [actor, id]
    );
    await pool.query(
      `INSERT INTO store_approval_history (store_id, action, from_status, to_status, actor, note)
       VALUES ($1, 'APPROVED', $2, 'approved', $3, $4)`,
      [id, before.rows[0].approval_status, actor, (req.body && req.body.note) || null]
    );
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/store-applications/:id/reject', async (req, res) => {
  const id = Number(req.params.id);
  const reason = String((req.body && req.body.reason) || '').trim();
  const actor = String((req.body && req.body.actor) || 'admin');
  if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason required' });
  try {
    const before = await pool.query(`SELECT approval_status FROM stores WHERE id = $1`, [id]);
    if (!before.rowCount) return res.status(404).json({ success: false, message: 'Not found' });
    await pool.query(
      `UPDATE stores SET approval_status = 'rejected', rejection_reason = $1 WHERE id = $2`,
      [reason, id]
    );
    await pool.query(
      `INSERT INTO store_approval_history (store_id, action, from_status, to_status, actor, note)
       VALUES ($1, 'REJECTED', $2, 'rejected', $3, $4)`,
      [id, before.rows[0].approval_status, actor, reason]
    );
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/store-applications/:id/request-info', async (req, res) => {
  const id = Number(req.params.id);
  const note = String((req.body && req.body.note) || '').trim();
  const actor = String((req.body && req.body.actor) || 'admin');
  if (!note) return res.status(400).json({ success: false, message: 'Note required' });
  try {
    await pool.query(
      `UPDATE stores SET approval_status = 'more_info_required', rejection_reason = $1 WHERE id = $2`,
      [note, id]
    );
    await pool.query(
      `INSERT INTO store_approval_history (store_id, action, from_status, to_status, actor, note)
       VALUES ($1, 'REQUEST_INFO', NULL, 'more_info_required', $2, $3)`,
      [id, actor, note]
    );
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});
