import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../config/api_config.dart';
import '../services/order_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_ui.dart';
import 'live_tracking_screen.dart';

class OrderDetailsScreen extends StatefulWidget {
  final int orderId;
  const OrderDetailsScreen({super.key, required this.orderId});

  @override
  State<OrderDetailsScreen> createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends State<OrderDetailsScreen> {
  Map<String, dynamic>? _order;
  String? _error;
  IO.Socket? _socket;
  Map<String, dynamic>? _liveLocation;
  String? _liveStatus;

  @override
  void initState() {
    super.initState();
    _load();
    _connectSocket();
  }

  @override
  void dispose() {
    _socket?.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final order = await OrderService.getOrder(widget.orderId);
      if (!mounted) return;
      setState(() {
        _order = order;
        _liveStatus = '${order['status'] ?? ''}';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    }
  }

  void _connectSocket() {
    try {
      final root = ApiConfig.baseUrl.replaceAll(RegExp(r'/api/?$'), '');
      final socket = IO.io(
        root,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .build(),
      );
      socket.connect();
      socket.onConnect((_) {
        socket.emit('order:subscribe', {
          'orderId': widget.orderId,
          'role': 'customer',
        });
      });
      socket.on('order:status', (data) {
        if (!mounted || data is! Map) return;
        setState(() {
          _liveStatus = data['status']?.toString() ?? _liveStatus;
          _order = {
            ...?_order,
            'status': data['status'] ?? _order?['status'],
            if (data['payment_status'] != null)
              'payment_status': data['payment_status'],
          };
        });
      });
      socket.on('location:update', (data) {
        if (!mounted || data is! Map) return;
        setState(() => _liveLocation = Map<String, dynamic>.from(data));
      });
      _socket = socket;
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Order #PVL${widget.orderId}')),
      body: _error != null
          ? AppErrorState(message: _error!, onRetry: _load)
          : _order == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _buildBody(_order!),
                ),
    );
  }

  Widget _buildBody(Map<String, dynamic> order) {
    final status =
        (_liveStatus ?? '${order['status'] ?? 'pending'}').toLowerCase();
    final items = List<Map<String, dynamic>>.from(
        (order['items'] as List? ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map)));
    final total = double.tryParse('${order['total_amount'] ?? 0}') ?? 0;
    final subtotal = double.tryParse('${order['subtotal'] ?? 0}') ?? total;
    final delivery = double.tryParse('${order['delivery_fee'] ?? 0}') ?? 0;

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        _statusCard(status),
        const SizedBox(height: AppSpacing.lg),
        if (!['delivered', 'cancelled'].contains(status))
          FilledButton.icon(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => LiveTrackingScreen(
                  orderId: widget.orderId,
                  storeLat: double.tryParse(
                      '${order['store_latitude'] ?? ''}'),
                  storeLng: double.tryParse(
                      '${order['store_longitude'] ?? ''}'),
                  destLat: double.tryParse(
                      '${order['latitude'] ?? order['delivery_latitude'] ?? ''}'),
                  destLng: double.tryParse(
                      '${order['longitude'] ?? order['delivery_longitude'] ?? ''}'),
                ),
              ),
            ),
            icon: const Icon(Icons.map_outlined),
            label: const Text('Open live tracking map'),
          ),
        const SizedBox(height: AppSpacing.lg),
        if (_liveLocation != null) _liveLocationCard(),
        const SizedBox(height: AppSpacing.lg),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Delivery address',
                    style: TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: AppSpacing.sm),
                Text('${order['address_label'] ?? 'Address'}',
                    style: const TextStyle(
                        color: AppColors.brandDark,
                        fontWeight: FontWeight.w700)),
                Text('${order['full_address'] ?? ''}'),
                Text(
                  '${order['city'] ?? ''}, ${order['state'] ?? ''} - ${order['pincode'] ?? ''}',
                  style: const TextStyle(color: AppColors.inkMuted),
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
              children: [
                const Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Items',
                        style: TextStyle(fontWeight: FontWeight.w800))),
                const SizedBox(height: AppSpacing.md),
                ...items.map((it) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: Row(
                        children: [
                          Text('${it['quantity']} \u00D7',
                              style: const TextStyle(
                                  color: AppColors.brandDark,
                                  fontWeight: FontWeight.w800)),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                              child: Text('${it['product_name'] ?? ''}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis)),
                          Text(
                              '\u20B9${double.tryParse('${it['total_price'] ?? 0}')?.toStringAsFixed(0) ?? 0}'),
                        ],
                      ),
                    )),
                const Divider(height: AppSpacing.xl),
                _row('Item total', '\u20B9${subtotal.toStringAsFixed(0)}'),
                if (delivery > 0)
                  _row('Delivery fee',
                      '\u20B9${delivery.toStringAsFixed(0)}'),
                const SizedBox(height: AppSpacing.sm),
                _row('Total', '\u20B9${total.toStringAsFixed(0)}',
                    strong: true),
                const SizedBox(height: AppSpacing.md),
                _row(
                    'Payment',
                    '${order['payment_method']} \u2022 ${order['payment_status']}'),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        _timelineCard(order),
      ],
    );
  }

  Widget _statusCard(String status) {
    final display = status.replaceAll('_', ' ').toUpperCase();
    final isDelivered = status == 'delivered';
    final isCancelled = status == 'cancelled';
    Color color = AppColors.brandPrimary;
    if (isDelivered) color = AppColors.success;
    if (isCancelled) color = AppColors.error;
    return Card(
      color: color.withValues(alpha: 0.10),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Row(
          children: [
            Icon(
                isDelivered
                    ? Icons.check_circle_rounded
                    : isCancelled
                        ? Icons.cancel_rounded
                        : Icons.local_shipping_rounded,
                color: color,
                size: 34),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(display,
                      style: TextStyle(
                          color: color,
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                          letterSpacing: 0.6)),
                  const SizedBox(height: 2),
                  Text(
                    isDelivered
                        ? 'Delivered'
                        : isCancelled
                            ? 'This order was cancelled'
                            : 'Track your order in real time',
                    style: const TextStyle(color: AppColors.inkMuted),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _liveLocationCard() {
    final lat = _liveLocation!['latitude'] ?? _liveLocation!['lat'];
    final lng = _liveLocation!['longitude'] ?? _liveLocation!['lng'];
    return Card(
      color: AppColors.brandSoft,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Row(
          children: [
            const Icon(Icons.gps_fixed_rounded,
                color: AppColors.brandDark),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Delivery partner is en route',
                      style: TextStyle(
                          color: AppColors.brandDark,
                          fontWeight: FontWeight.w800)),
                  const SizedBox(height: 2),
                  Text('Last position: $lat, $lng',
                      style: const TextStyle(
                          color: AppColors.inkMuted, fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _timelineCard(Map<String, dynamic> order) {
    final history = List<Map<String, dynamic>>.from(
        (order['status_history'] as List? ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map)));
    if (history.isEmpty) return const SizedBox.shrink();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Status timeline',
                style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: AppSpacing.md),
            ...history.map((h) {
              final ts = '${h['created_at'] ?? ''}';
              final display = ts.length >= 16 ? ts.substring(0, 16) : ts;
              return Padding(
                padding:
                    const EdgeInsets.symmetric(vertical: AppSpacing.xs),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded,
                        size: 18, color: AppColors.brandPrimary),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                          '${h['status'] ?? ''}'
                              .replaceAll('_', ' ')
                              .toUpperCase(),
                          style: const TextStyle(
                              fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                    Text(display,
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.inkMuted)),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value, {bool strong = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: Row(
        children: [
          Expanded(
              child: Text(label,
                  style: TextStyle(
                      color: strong ? AppColors.ink : AppColors.inkMuted,
                      fontWeight:
                          strong ? FontWeight.w800 : FontWeight.w500))),
          Text(value,
              style: TextStyle(
                  fontWeight: strong ? FontWeight.w800 : FontWeight.w600)),
        ],
      ),
    );
  }
}