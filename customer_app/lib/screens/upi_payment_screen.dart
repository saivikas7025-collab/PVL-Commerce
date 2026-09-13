import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../services/order_service.dart';
import '../theme/app_theme.dart';
import 'order_confirmation_screen.dart';

/// The UPI VPA that customers pay to. Configured here so it's one place to change.
const String kPvlUpiId = '9063257025@ybl';
const String kPvlPayeeName = 'PVL Mart';

class UpiPaymentScreen extends StatefulWidget {
  final int orderId;
  final double amount;

  const UpiPaymentScreen({
    super.key,
    required this.orderId,
    required this.amount,
  });

  @override
  State<UpiPaymentScreen> createState() => _UpiPaymentScreenState();
}

class _UpiPaymentScreenState extends State<UpiPaymentScreen> {
  bool _submitting = false;
  String? _error;

  String _buildUpiUri({String? schemeApp}) {
    // UPI deep link spec: https://npci.org.in/PDF/npci/upi/Product-Overview.pdf
    final params = {
      'pa': kPvlUpiId,
      'pn': kPvlPayeeName,
      'am': widget.amount.toStringAsFixed(2),
      'cu': 'INR',
      'tn': 'PVL${widget.orderId}',
    };
    final qs = params.entries
        .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
        .join('&');
    if (schemeApp == null) return 'upi://pay?$qs';
    return '$schemeApp://pay?$qs';
  }

  Future<void> _open(String scheme) async {
    final uri = Uri.parse(_buildUpiUri(schemeApp: scheme));
    // On web, use clipboard + hint since we can't launch external apps reliably.
    await Clipboard.setData(ClipboardData(text: uri.toString()));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('UPI link copied. Open $scheme and paste if it doesn\'t open automatically.'),
        duration: const Duration(seconds: 4),
      ),
    );
  }

  Future<void> _confirmPaid() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await OrderService.confirmUpiPayment(
        orderId: widget.orderId,
        upiReference: 'pending-manual-verification',
      );
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => OrderConfirmationScreen(
            orderId: widget.orderId,
            paid: false, // Not yet verified — pending manual check
          ),
        ),
        (r) => r.isFirst,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final qrData = _buildUpiUri();

    return Scaffold(
      appBar: AppBar(title: const Text('Pay via UPI')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Text(
                    'Scan this QR with any UPI app',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: QrImageView(
                      data: qrData,
                      version: QrVersions.auto,
                      size: 240,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  const Text('Or pay to UPI ID:',
                      style: TextStyle(color: AppColors.inkMuted)),
                  const SizedBox(height: AppSpacing.xs),
                  SelectableText(
                    kPvlUpiId,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                      color: AppColors.brandDark,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton(
                          onPressed: () => _open('gpay'),
                          child: const Text('GPay'),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: FilledButton(
                          onPressed: () => _open('phonepe'),
                          child: const Text('PhonePe'),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: FilledButton(
                          onPressed: () => _open('paytmmp'),
                          child: const Text('Paytm'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Order total: ₹${widget.amount.toStringAsFixed(0)}',
                      style: const TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 18)),
                  const SizedBox(height: AppSpacing.sm),
                  Text('Order #PVL${widget.orderId}',
                      style: const TextStyle(color: AppColors.inkMuted)),
                  const SizedBox(height: AppSpacing.md),
                  const Text(
                    'After paying, tap "I have paid" below. The store will verify your payment and dispatch the order.',
                    style: TextStyle(fontSize: 13, height: 1.4),
                  ),
                ],
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.md),
            Text(_error!, style: const TextStyle(color: AppColors.error)),
          ],
          const SizedBox(height: AppSpacing.lg),
          FilledButton.icon(
            onPressed: _submitting ? null : _confirmPaid,
            icon: _submitting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.check_circle_rounded),
            label: const Text('I have paid — place my order'),
          ),
        ],
      ),
    );
  }
}
