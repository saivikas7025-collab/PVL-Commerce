import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/order_service.dart';
import '../theme/app_theme.dart';
import 'order_confirmation_screen.dart';

/// UPI VPA — all payments go here.
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

  /// Build a UPI URI (optionally with a specific app scheme).
  String _buildUpiUri({String? appScheme}) {
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
    if (appScheme == null) return 'upi://pay?$qs';
    return '$appScheme://pay?$qs';
  }

  /// Try the app-specific scheme; fall back to generic upi:// (opens chooser).
  Future<void> _open(String scheme, String label) async {
    // Try app-specific
    try {
      final uri = Uri.parse(_buildUpiUri(appScheme: scheme));
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        return;
      }
    } catch (_) {}

    // Fallback: generic upi:// — Android shows an app chooser
    try {
      final generic = Uri.parse(_buildUpiUri());
      if (await canLaunchUrl(generic)) {
        await launchUrl(generic, mode: LaunchMode.externalApplication);
        return;
      }
    } catch (_) {}

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open $label. Scan the QR instead.')),
      );
    }
  }

  Future<void> _copyUpi() async {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('UPI ID: 9063257025@ybl — copy and pay in your app')),
      );
    }
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
            paid: false,
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
          // QR card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
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
                  GestureDetector(
                    onTap: _copyUpi,
                    child: const SelectableText(
                      kPvlUpiId,
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 18,
                        color: AppColors.brandDark,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Open UPI app buttons
          if (!kIsWeb) ...[
            const Text(
              'Or open your UPI app directly:',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
            ),
            const SizedBox(height: AppSpacing.md),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF1A73E8),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () => _open('tez', 'Google Pay'),
                icon: const Icon(Icons.account_balance_wallet_rounded),
                label: const Text('Pay with Google Pay'),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF5F259F),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () => _open('phonepe', 'PhonePe'),
                icon: const Icon(Icons.account_balance_wallet_rounded),
                label: const Text('Pay with PhonePe'),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF00BAF2),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () => _open('paytmmp', 'Paytm'),
                icon: const Icon(Icons.account_balance_wallet_rounded),
                label: const Text('Pay with Paytm'),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _open('upi', 'UPI app'),
                icon: const Icon(Icons.apps_rounded),
                label: const Text('Other UPI app'),
              ),
            ),
          ] else ...[
            Card(
              color: AppColors.surfaceSecondary,
              child: const ListTile(
                leading: Icon(Icons.qr_code_2),
                title: Text('On web, scan the QR with your phone'),
                subtitle: Text('Or copy the UPI ID and pay from your phone'),
              ),
            ),
          ],

          const SizedBox(height: AppSpacing.lg),

          // Order summary
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Order total: Rs. ${widget.amount.toStringAsFixed(0)}',
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                  ),
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
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],

          const SizedBox(height: AppSpacing.lg),

          // Confirm button
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.brandDark,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
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
          ),
        ],
      ),
    );
  }
}
