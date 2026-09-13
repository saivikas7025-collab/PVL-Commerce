import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../models/address.dart';
import '../providers/address_provider.dart';
import '../providers/cart_provider.dart';
import '../services/order_service.dart';
import '../services/payment_service.dart';
import '../theme/app_theme.dart';
import 'address_screens.dart';
import 'order_confirmation_screen.dart';
import 'upi_payment_screen.dart';

enum _PaymentMethod { razorpay, cod }

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  Address? _selectedAddress;
  _PaymentMethod _method = _PaymentMethod.cod;
  bool _loadingConfig = true;
  bool _codEnabled = true;
  bool _razorpayEnabled = false;
  bool _placing = false;
  String? _error;
  final _notesController = TextEditingController();

  Razorpay? _razorpay;
  int? _pendingOrderId;

  @override
  void initState() {
    super.initState();
    _init();
    if (!kIsWeb) {
      _razorpay = Razorpay()
        ..on(Razorpay.EVENT_PAYMENT_SUCCESS, _onPaymentSuccess)
        ..on(Razorpay.EVENT_PAYMENT_ERROR, _onPaymentError)
        ..on(Razorpay.EVENT_EXTERNAL_WALLET, _onExternalWallet);
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    _razorpay?.clear();
    super.dispose();
  }

  Future<void> _init() async {
    await context.read<AddressProvider>().refresh();
    if (!mounted) return;
    final cfg = await PaymentService.publicConfig();
    if (!mounted) return;
    setState(() {
      _codEnabled = cfg['cod_enabled'] ?? true;
      _razorpayEnabled = cfg['razorpay_enabled'] ?? false;
      _selectedAddress = context.read<AddressProvider>().defaultAddress;
      _method = _razorpayEnabled ? _PaymentMethod.razorpay : _PaymentMethod.cod;
      _loadingConfig = false;
    });
  }

  Future<void> _pickAddress() async {
    final address = await Navigator.of(context).push<Address>(
      MaterialPageRoute(
        builder: (_) => const AddressBookScreen(selectionMode: true),
      ),
    );
    if (address != null && mounted) {
      setState(() => _selectedAddress = address);
    }
  }

  Future<void> _placeOrder() async {
    if (_selectedAddress == null) {
      setState(() => _error = 'Please select a delivery address.');
      return;
    }
    setState(() {
      _placing = true;
      _error = null;
    });

    try {
      final paymentMethod = _method == _PaymentMethod.razorpay ? 'RAZORPAY' : 'COD';
      final response = await OrderService.createOrder(
        addressId: _selectedAddress!.id,
        paymentMethod: paymentMethod,
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );

      final order = Map<String, dynamic>.from(response['order'] as Map);
      final orderId = int.tryParse('${order['id']}') ?? 0;

      if (paymentMethod == 'COD') {
        // ignore: use_build_context_synchronously
        context.read<CartProvider>().reset();
        _goToConfirmation(orderId, paid: false);
        return;
      }

      if (kIsWeb || _razorpay == null) {
        // Web / no Razorpay SDK: use UPI QR + manual verification.
        final orderTotal = double.tryParse('') ??
            context.read<CartProvider>().subtotal;
        setState(() => _placing = false);
        if (!mounted) return;
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => UpiPaymentScreen(
              orderId: orderId,
              amount: orderTotal,
            ),
          ),
        );
        return;
      }

      final rz = await PaymentService.createRazorpayOrder(orderId);
      _pendingOrderId = orderId;
      final options = {
        'key': rz['key_id'],
        'order_id': rz['order_id'],
        'amount': rz['amount'],
        'currency': rz['currency'] ?? 'INR',
        'name': 'PVL Mart',
        'description': 'Order #PVL$orderId',
        'prefill': {'contact': '', 'email': ''},
        'theme': {'color': '#059669'},
      };
      _razorpay!.open(options);
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '').replaceFirst('ApiException: ', '');
        _placing = false;
      });
    }
  }

  Future<void> _onPaymentSuccess(PaymentSuccessResponse response) async {
    final orderId = _pendingOrderId;
    if (orderId == null) return;
    final verified = await PaymentService.verifyRazorpayPayment(
      orderId: orderId,
      razorpayOrderId: response.orderId ?? '',
      razorpayPaymentId: response.paymentId ?? '',
      razorpaySignature: response.signature ?? '',
    );
    if (!mounted) return;
    if (verified) {
      // ignore: use_build_context_synchronously
      context.read<CartProvider>().reset();
      _pendingOrderId = null;
      _goToConfirmation(orderId, paid: true);
    } else {
      _pendingOrderId = null;
      setState(() {
        _placing = false;
        _error =
            'We could not verify your payment. If money was debited it will be refunded automatically.';
      });
    }
  }

  Future<void> _onPaymentError(PaymentFailureResponse response) async {
    final orderId = _pendingOrderId;
    if (!mounted) return;
    setState(() {
      _placing = false;
      _error = 'Payment did not complete: ${response.message ?? "Please try again"}.';
    });
    if (orderId != null) {
      _offerCodFallback(orderId);
    }
    _pendingOrderId = null;
  }

  void _onExternalWallet(ExternalWalletResponse response) {
    if (!mounted) return;
    setState(() => _placing = false);
    _pendingOrderId = null;
  }

  void _offerCodFallback(int orderId) {
    if (!_codEnabled) return;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Pay with Cash on Delivery instead?',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            const SizedBox(height: AppSpacing.md),
            const Text(
                'Your order is on hold. You can switch to Cash on Delivery and it will be sent to the store right away.'),
            const SizedBox(height: AppSpacing.lg),
            FilledButton(
              onPressed: () async {
                Navigator.pop(context);
                try {
                  await PaymentService.convertToCod(orderId);
                  if (!mounted) return;
                  // ignore: use_build_context_synchronously
                  context.read<CartProvider>().reset();
                  _pendingOrderId = null;
                  _goToConfirmation(orderId, paid: false);
                } catch (e) {
                  if (!mounted) return;
                  setState(() => _error =
                      'Could not switch to COD. ${e.toString().replaceFirst("Exception: ", "")}');
                }
              },
              child: const Text('Yes, pay Cash on Delivery'),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Try paying again')),
          ],
        ),
      ),
    );
  }

  void _goToConfirmation(int orderId, {required bool paid}) {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => OrderConfirmationScreen(orderId: orderId, paid: paid),
      ),
      (r) => r.isFirst,
    );
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final canPlace = !_placing &&
        !_loadingConfig &&
        cart.items.isNotEmpty &&
        _selectedAddress != null &&
        ((_method == _PaymentMethod.cod && _codEnabled) ||
            (_method == _PaymentMethod.razorpay && _razorpayEnabled));

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: _loadingConfig
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [
                _section(
                  title: 'Delivery address',
                  action: TextButton(
                    onPressed: _pickAddress,
                    child: Text(_selectedAddress == null ? 'Select' : 'Change'),
                  ),
                  child: _selectedAddress == null
                      ? const Text(
                          'No address selected yet.',
                          style: TextStyle(color: AppColors.inkMuted),
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_selectedAddress!.label,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.brandDark)),
                            const SizedBox(height: AppSpacing.xs),
                            Text(_selectedAddress!.fullAddress),
                            Text(
                              '${_selectedAddress!.city}, ${_selectedAddress!.state} - ${_selectedAddress!.pincode}',
                              style: const TextStyle(color: AppColors.inkMuted),
                            ),
                          ],
                        ),
                ),
                const SizedBox(height: AppSpacing.lg),
                _section(
                  title: 'Order summary',
                  child: Column(
                    children: [
                      ...cart.items.map((line) => Padding(
                            padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                      '${line.quantity} × ${line.product.name}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis),
                                ),
                                Text('₹${line.total.toStringAsFixed(0)}'),
                              ],
                            ),
                          )),
                      const Divider(height: AppSpacing.xl),
                      _row('Item total', '₹${cart.subtotal.toStringAsFixed(0)}'),
                      const SizedBox(height: AppSpacing.xs),
                      _row('Delivery fee', 'Calculated by store', muted: true),
                      const SizedBox(height: AppSpacing.md),
                      _row(
                        'Payable (estimated)',
                        '₹${cart.subtotal.toStringAsFixed(0)}+',
                        strong: true,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      const Text(
                        'Final total is calculated by the server after placing the order.',
                        style: TextStyle(fontSize: 11, color: AppColors.inkMuted),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                _section(
                  title: 'Payment method',
                  child: Column(
                    children: [
                      RadioListTile<_PaymentMethod>(
                        contentPadding: EdgeInsets.zero,
                        value: _PaymentMethod.razorpay,
                        groupValue: _method,
                        onChanged: _razorpayEnabled
                            ? (v) => setState(() => _method = v!)
                            : null,
                        title: const Text('UPI / Card / Netbanking (Razorpay)'),
                        subtitle: _razorpayEnabled
                            ? const Text('Secure online payment')
                            : const Text(
                                'Currently disabled — awaiting Razorpay keys on the server.',
                                style: TextStyle(color: AppColors.error),
                              ),
                      ),
                      RadioListTile<_PaymentMethod>(
                        contentPadding: EdgeInsets.zero,
                        value: _PaymentMethod.cod,
                        groupValue: _method,
                        onChanged: _codEnabled
                            ? (v) => setState(() => _method = v!)
                            : null,
                        title: const Text('Cash on Delivery'),
                        subtitle: _codEnabled
                            ? const Text('Pay when the order arrives')
                            : const Text(
                                'Cash on Delivery is currently disabled.',
                                style: TextStyle(color: AppColors.error),
                              ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                _section(
                  title: 'Delivery instructions (optional)',
                  child: TextField(
                    controller: _notesController,
                    minLines: 2,
                    maxLines: 3,
                    maxLength: 500,
                    decoration: const InputDecoration(
                      hintText: 'e.g. leave at the door, call on arrival',
                    ),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  Text(_error!, style: const TextStyle(color: AppColors.error)),
                ],
                const SizedBox(height: 100),
              ],
            ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.all(AppSpacing.lg),
        child: FilledButton(
          onPressed: canPlace ? _placeOrder : null,
          child: _placing
              ? const SizedBox(
                  height: 20, width: 20,
                  child: CircularProgressIndicator(
                      color: Colors.white, strokeWidth: 2))
              : Text(_method == _PaymentMethod.cod
                  ? 'Place order (Cash on Delivery)'
                  : 'Pay & place order'),
        ),
      ),
    );
  }

  Widget _section({required String title, Widget? action, required Widget child}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(title,
                      style: const TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 15)),
                ),
                if (action != null) action,
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            child,
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value, {bool strong = false, bool muted = false}) {
    return Row(
      children: [
        Expanded(
          child: Text(label,
              style: TextStyle(
                  color: muted ? AppColors.inkMuted : AppColors.ink,
                  fontWeight: strong ? FontWeight.w800 : FontWeight.w500)),
        ),
        Text(value,
            style: TextStyle(
                fontWeight: strong ? FontWeight.w800 : FontWeight.w600)),
      ],
    );
  }
}