/**
 * Razorpay SDK wrapper.
 *
 * Loads keys from environment variables. If keys are missing we DO NOT
 * fabricate anything — callers must handle the resulting error.
 */
const crypto = require('crypto');
const Razorpay = require('razorpay');

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

let client = null;

/**
 * Lazily create the SDK client. Throws a clear error when keys are missing
 * so the caller can return a friendly HTTP response.
 */
function getClient() {
  if (client) return client;
  if (!KEY_ID || !KEY_SECRET) {
    throw new Error(
      'Razorpay credentials are not configured on the server. ' +
      'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the backend .env file.'
    );
  }
  client = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
  return client;
}

/**
 * Verify a Razorpay checkout callback signature.
 *
 * The exact formula Razorpay documents is:
 *   HMAC_SHA256(order_id + "|" + payment_id, key_secret)
 */
function verifyCheckoutSignature({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) {
  if (!KEY_SECRET) return false;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(razorpay_signature), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verify a Razorpay webhook body against the webhook secret.
 *
 * `rawBody` must be the exact bytes Razorpay sent — do NOT re-stringify.
 */
function verifyWebhookSignature(rawBody, signature) {
  if (!WEBHOOK_SECRET || !signature || !Buffer.isBuffer(rawBody)) return false;
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** True if the server has any Razorpay keys configured (used by the client). */
function isConfigured() {
  return Boolean(KEY_ID && KEY_SECRET);
}

module.exports = {
  KEY_ID,
  isConfigured,
  getClient,
  verifyCheckoutSignature,
  verifyWebhookSignature,
};
