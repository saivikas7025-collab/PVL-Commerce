import 'package:flutter/material.dart';

import '../services/order_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_ui.dart';
import 'order_details_screen.dart';

class OrderConfirmationScreen extends StatefulWidget {
  final int orderId;
  final bool paid;

  const OrderConfirmationScreen({
    super.key,
    required this.orderId,
    required this.paid,
  });

  @override
  State<OrderConfirmationScreen> createState() =>
      _OrderConfirmationScreenState();
}

class _OrderConfirmationScreenState extends State<OrderConfirmationScreen> {
  Map<String, dynamic>? _order;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final order = await OrderService.getOrder(widget.orderId);
      if (!mounted) return;
      setState(() => _order = order);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error =
          e.toString().replaceFirst('Exception: ', '').replaceFirst('ApiException: ', ''));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Order placed'),
      ),
      body: _error != null
          ? AppErrorState(message: _error!, onRetry: _load)
          : _order == null
              ? const Center(child: CircularProgressIndicator())
              : _buildBody(context, _order!),
    );
  }

  Widget _buildBody(BuildContext context, Map<String, dynamic> order) {
    final total = double.tryParse('${order['total_amount'] ?? 0}') ?? 0;
    final paymentMethod = '${order['payment_method'] ?? 'COD'}';
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        const SizedBox(height: AppSpacing.xl),
        Center(
          child: Container(
            width: 92,
            height: 92,
            decoration: const BoxDecoration(
              color: AppColors.brandSoft,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_rounded,
                color: AppColors.brandDark, size: 56),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        const Center(
          child: Text('Order confirmed',
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5)),
        ),
        const SizedBox(height: AppSpacing.sm),
        Center(
          child: Text(
            widget.paid
                ? 'Payment received. Your groceries are on the way.'
                : paymentMethod == 'COD'
                    ? 'Please keep ₹${total.toStringAsFixed(0)} ready for the delivery partner.'
                    : 'Your order will start once payment is confirmed.',
            style: const TextStyle(color: AppColors.inkMuted),
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: AppSpacing.xxl),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              children: [
                _row('Order ID', '#PVL${order['id']}'),
                _row('Total', '₹${total.toStringAsFixed(0)}'),
                _row('Payment', paymentMethod),
                _row('Payment status', '${order['payment_status'] ?? 'pending'}'),
                if (order['full_address'] != null)
                  _row('Delivering to', '${order['full_address']}'),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        FilledButton.icon(
          onPressed: () => Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (_) => OrderDetailsScreen(orderId: widget.orderId),
            ),
          ),
          icon: const Icon(Icons.local_shipping_outlined),
          label: const Text('Track this order'),
        ),
        const SizedBox(height: AppSpacing.md),
        OutlinedButton.icon(
          onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
          icon: const Icon(Icons.storefront_outlined),
          label: const Text('Continue shopping'),
        ),
      ],
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: Row(
        children: [
          Expanded(
              child: Text(label,
                  style: const TextStyle(color: AppColors.inkMuted))),
          Flexible(
              child: Text(value,
                  textAlign: TextAlign.right,
                  style: const TextStyle(fontWeight: FontWeight.w700))),
        ],
      ),
    );
  }
}