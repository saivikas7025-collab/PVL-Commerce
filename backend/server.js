/**
 * PVL Commerce backend
 *
 * Ordering matters:
 *   1. helmet
 *   2. cors
 *   3. Razorpay webhook (uses express.raw — MUST come before express.json)
 *   4. express.json for the rest of the API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { testDatabaseConnection } = require('./db');
const { handleWebhook: razorpayWebhook } = require('./routes/razorpayWebhook');

const authRoutes = require('./routes/auth');
const addressRoutes = require('./routes/addresses');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payment');
const storeRoutes = require('./routes/store');
const storeDashboardRoutes = require('./routes/storeDashboard');
const deliveryRoutes = require('./routes/delivery');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('10.0.2.2')) return callback(null, true);
  if (ALLOWED_ORIGINS.length === 0) return callback(null, true);
  if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
  return callback(new Error('Not allowed by CORS'));
}

// ---- basic hardening ---------------------------------------
app.use(helmet());

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Razorpay-Signature',
    ],
  })
);

// ---- Razorpay webhook (raw body!) --------------------------
// Must be registered BEFORE express.json() so the HMAC still sees
// the exact bytes Razorpay signed.
app.post(
  '/api/payment/razorpay/webhook',
  express.raw({ type: 'application/json' }),
  razorpayWebhook
);

// ---- JSON body parser --------------------------------------
app.use(express.json({ limit: '200kb' }));

// ---- feature flags exposed to the client -------------------
app.get('/api/config/public', (req, res) => {
  res.json({
    success: true,
    cod_enabled:
      String(process.env.COD_ENABLED || 'true').toLowerCase() === 'true',
    razorpay_enabled: Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ),
  });
});

// ---- health + root -----------------------------------------
app.get('/', (req, res) =>
  res.json({
    success: true,
    message: 'PVL-Commerce backend is running',
  })
);

app.get('/api/health', (req, res) =>
  res.json({
    success: true,
    status: 'OK',
    service: 'PVL-Commerce API',
  })
);

// ---- API routes --------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/store', storeDashboardRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/admin', adminRoutes);

// legacy /api/store... some helpers still live here
app.use('/api/store-legacy', storeRoutes);

// ---- HTTP + Socket.IO --------------------------------------
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

// In-memory delivery location cache.
const liveLocations = new Map();

io.on('connection', (socket) => {
  socket.on('order:subscribe', (data) => {
    const orderId = Number(data?.orderId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return;
    }

    const role = String(data?.role || 'viewer');

    socket.join(`order_${orderId}`);

    socket.data.role = role;
    socket.data.orderId = orderId;

    const loc = liveLocations.get(orderId);

    if (loc) {
      socket.emit('location:update', loc);
    }
  });

  socket.on('store:subscribe', (data) => {
    const storeId = Number(data?.storeId);

    if (Number.isInteger(storeId) && storeId > 0) {
      socket.join(`store_${storeId}`);
    }
  });

  socket.on('delivery:join', (data) => {
    const orderId = Number(data?.orderId);
    const deliveryPartnerId = Number(
      data?.deliveryPartnerId || 0
    );

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return;
    }

    socket.join(`order_${orderId}`);

    socket.data.role = 'delivery_partner';
    socket.data.orderId = orderId;
    socket.data.deliveryPartnerId = deliveryPartnerId;

    const loc = liveLocations.get(orderId);

    if (loc) {
      socket.emit('location:update', loc);
    }
  });

  socket.on('location:update', (data) => {
    const orderId = Number(data?.orderId);
    const latitude = Number(data?.latitude);
    const longitude = Number(data?.longitude);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return;
    }

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      return;
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return;
    }

    if (
      socket.data.role !== 'delivery_partner' ||
      socket.data.orderId !== orderId
    ) {
      return;
    }

    const location = {
      orderId,
      deliveryPartnerId: Number(
        data?.deliveryPartnerId || 0
      ),
      latitude,
      longitude,
      accuracy: Number(data?.accuracy || 0),
      speed: Number(data?.speed || 0),
      heading: Number(data?.heading || 0),
      timestamp: new Date().toISOString(),
    };

    liveLocations.set(orderId, location);

    io.to(`order_${orderId}`).emit(
      'location:update',
      location
    );
  });
});

// ---- REST live-location endpoint ---------------------------
app.get('/api/live-location/:orderId', (req, res) => {
  const orderId = Number(req.params.orderId);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID',
    });
  }

  const location = liveLocations.get(orderId);

  return res.json({
    success: true,
    available: Boolean(location),
    location: location || null,
  });
});

// ---- start server ------------------------------------------
httpServer.listen(PORT, async () => {
  console.log(
    `PVL-Commerce backend running on port ${PORT}`
  );

  console.log('Socket.IO ready');

  await testDatabaseConnection();
});