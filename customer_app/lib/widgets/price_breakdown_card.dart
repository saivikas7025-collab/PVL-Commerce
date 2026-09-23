import 'package:flutter/material.dart';

/// Premium PVL price breakdown card.
/// Purely presentational — takes whatever the backend returned
/// in `pricing` and renders it faithfully.
class PriceBreakdownCard extends StatelessWidget {
  final Map<String, dynamic>? pricing;
  final Map<String, dynamic>? delivery;
  final Map<String, dynamic>? coupon;
  final bool loading;
  final String? error;

  const PriceBreakdownCard({
    super.key,
    this.pricing,
    this.delivery,
    this.coupon,
    this.loading = false,
    this.error,
  });

  static const _green = Color(0xFF10B981);
  static const _greenDark = Color(0xFF047857);
  static const _greenSoft = Color(0xFFECFDF5);
  static const _textDark = Color(0xFF0F172A);
  static const _textMuted = Color(0xFF64748B);
  static const _border = Color(0xFFE2E8F0);
  static const _bg = Color(0xFFF8FAFC);
  static const _divider = Color(0xFFEEF2F7);
  static const _warning = Color(0xFFF59E0B);

  double _n(dynamic v) {
    if (v == null) return 0;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0;
  }

  String _r(double v) {
    // Round to 2 dp, drop trailing .00
    final rounded = (v * 100).round() / 100;
    return rounded == rounded.roundToDouble()
        ? rounded.toStringAsFixed(0)
        : rounded.toStringAsFixed(2);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.receipt_long_outlined, size: 18, color: _greenDark),
                SizedBox(width: 8),
                Text(
                  'Price Details',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.2,
                    color: _textDark,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (loading) _loadingState(),
            if (error != null && !loading) _errorState(),
            if (pricing != null && !loading && error == null) _breakdown(),
          ],
        ),
      ),
    );
  }

  Widget _loadingState() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Center(
        child: Column(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: _green,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Calculating best price…',
              style: TextStyle(fontSize: 12, color: _textMuted),
            ),
          ],
        ),
      ),
    );
  }

  Widget _errorState() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: _warning.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: _warning.withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            const Icon(Icons.info_outline, color: _warning, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                error ?? 'Price unavailable',
                style: const TextStyle(fontSize: 12.5, color: _textDark),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _breakdown() {
    final p = pricing!;
    final mrp = _n(p['mrp_total']);
    final productDiscount = _n(p['product_discount']);
    final itemsTotal = _n(p['items_total']);
    final handling = _n(p['handling_charge']);
    final delivery = _n(p['delivery_charge']);
    final platform = _n(p['platform_fee']);
    final couponDiscount = _n(p['coupon_discount']);
    final tax = _n(p['tax']);
    final grand = _n(p['grand_total']);
    final savings = _n(p['total_savings']);

    final freeDelivery = delivery == 0 &&
        (delivery is num) &&
        (delivery == 0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ------------- Items block -------------
        _row('MRP', '₹${_r(mrp)}'),
        if (productDiscount > 0)
          _row('Product Discount', '-₹${_r(productDiscount)}',
              valueColor: _green, isBold: false),
        _dividerLine(),
        _row('Items Subtotal', '₹${_r(itemsTotal)}', isBold: true),

        // ------------- Fees block -------------
        if (handling > 0) _row('Handling Charges', '₹${_r(handling)}'),
        if (delivery > 0)
          _row('Delivery Charges', '₹${_r(delivery)}')
        else
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Delivery Charges',
                style: TextStyle(fontSize: 13, color: _textDark),
              ),
              Row(
                children: [
                  Text(
                    '₹${_r(delivery)}',
                    style: const TextStyle(fontSize: 13, color: _green),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: _greenSoft,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'FREE',
                      style: TextStyle(
                        fontSize: 9,
                        color: _greenDark,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        if (platform > 0) _row('Platform Fee', '₹${_r(platform)}'),

        // ------------- Coupon block -------------
        if (couponDiscount > 0) ...[
          _row('Coupon Discount', '-₹${_r(couponDiscount)}',
              valueColor: _green),
          if (coupon != null && coupon!['code'] != null)
            Padding(
              padding: const EdgeInsets.only(top: 2, bottom: 4),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: _greenSoft,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      coupon!['code'].toString(),
                      style: const TextStyle(
                        fontSize: 10,
                        color: _greenDark,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'applied',
                    style: TextStyle(fontSize: 11, color: _textMuted),
                  ),
                ],
              ),
            ),
        ],

        // ------------- Tax -------------
        if (tax > 0) _row('Taxes', '₹${_r(tax)}'),

        // ------------- Grand total -------------
        const SizedBox(height: 4),
        _dividerLine(),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'TOTAL',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.2,
                color: _textDark,
              ),
            ),
            Text(
              '₹${_r(grand)}',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
                color: _textDark,
              ),
            ),
          ],
        ),

        // ------------- Savings banner -------------
        if (savings > 0) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: _greenSoft,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: _green.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.celebration_outlined, color: _greenDark, size: 18),
                const SizedBox(width: 8),
                Text(
                  'You saved ₹${_r(savings)} on this order',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: _greenDark,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _row(String label, String value,
      {Color? valueColor, bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: isBold ? _textDark : _textMuted,
              fontWeight: isBold ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: isBold ? 14 : 13,
              color: valueColor ?? _textDark,
              fontWeight:
                  isBold ? FontWeight.w700 : FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _dividerLine() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Container(height: 1, color: _divider),
    );
  }
}
