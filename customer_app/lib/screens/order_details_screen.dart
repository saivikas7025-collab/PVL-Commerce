import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../config/api_config.dart';
import '../services/order_service.dart';
import '../theme/app_theme.dart';
import 'live_tracking_screen.dart';

/// Step keys + labels + icons for the timeline.
const List<Map<String, Object>> _kSteps = [
  {'key': 'pending',         'label': 'Order placed',        'icon': Icons.receipt_long_outlined},
  {'key': 'accepted',        'label': 'Store accepted',       'icon': Icons.check_circle_outline},
  {'key': 'preparing',       'label': 'Preparing your order', 'icon': Icons.soup_kitchen_outlined},
  {'key': 'ready_for_pickup','label': 'Ready for pickup',     'icon': Icons.shopping_bag_outlined},
  {'key': 'assigned',        'label': 'Driver assigned',      'icon': Icons.delivery_dining_outlined},
  {'key': 'picked_up',       'label': 'Picked up from store', 'icon': Icons.inventory_2_outlined},
  {'key': 'out_for_delivery','label': 'Out for delivery',     'icon': Icons.local_shipping_outlined},
  {'key': 'delivered',       'label': 'Delivered',            'icon': Icons.home_filled},
];

class OrderDetailsScreen extends StatefulWidget {
  final int orderId;
  const OrderDetailsScreen({super.key, required this.orderId});

  @override
  State<OrderDetailsScreen> createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends State<OrderDetailsScreen> {
  Map<String, dynamic>? _order;
  List<Map<String, dynamic>> _history = [];
  String? _error;
  IO.Socket? _socket;
  LatLng? _driverLatLng;
  int? _etaMinutes;
  double? _distanceKm;

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
        _history = ((order['status_history'] as List?) ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
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
        IO.OptionBuilder().setTransports(['websocket']).disableAutoConnect().build(),
      );
      socket.connect();
      socket.onConnect((_) => socket.emit('order:subscribe', {
            'orderId': widget.orderId,
            'role': 'customer',
          }));
      socket.on('order:status', (data) {
        if (!mounted || data is! Map) return;
        setState(() {
          _order = {...?_order, 'status': data['status'] ?? _order?['status']};
        });
        _load(); // refresh history
      });
      socket.on('location:update', (data) {
        if (!mounted || data is! Map) return;
        final lat = double.tryParse('${data['latitude']}');
        final lng = double.tryParse('${data['longitude']}');
        if (lat == null || lng == null) return;
        setState(() => _driverLatLng = LatLng(lat, lng));
        _recalcEta();
      });
      _socket = socket;
    } catch (_) {}
  }

  void _recalcEta() {
    final lat = double.tryParse('${_order?['latitude']}');
    final lng = double.tryParse('${_order?['longitude']}');
    if (lat == null || lng == null || _driverLatLng == null) return;
    final dLat = lat - _driverLatLng!.latitude;
    final dLng = lng - _driverLatLng!.longitude;
    final dx = dLng * 111.0 * 0.85;
    final dy = dLat * 111.0;
    final km = _sqrt(dx * dx + dy * dy);
    _distanceKm = km;
    _etaMinutes = (km / 25.0 * 60).round();
    if (mounted) setState(() {});
  }

  double _sqrt(double x) {
    if (x <= 0) return 0;
    double g = x / 2;
    for (var i = 0; i < 20; i++) { g = (g + x / g) / 2; }
    return g;
  }

  String _currentStatus() => '${_order?['status'] ?? 'pending'}';

  bool _stepDone(String key) {
    final cur = _currentStatus();
    final curIdx = _kSteps.indexWhere((s) => s['key'] == cur);
    final stepIdx = _kSteps.indexWhere((s) => s['key'] == key);
    if (curIdx < 0 || stepIdx < 0) return false;
    return stepIdx <= curIdx;
  }

  String? _stepTime(String key) {
    for (final h in _history) {
      if ('${h['status']}' == key) return '${h['created_at'] ?? ''}';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    if (_order == null) {
      if (_error != null) {
        return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'track-live',
        onPressed: () {
          LiveTrackingScreen.show(
            context,
            widget.orderId,
          );
        },
        icon: const Icon(Icons.map),
        label: const Text('Track Live'),
        backgroundColor: const Color(0xFF10B981),
        foregroundColor: Colors.white,
      ),appBar: AppBar(title: const Text('Order')), body: Center(child: Text(_error!)));
      }
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final status = _currentStatus();
    final showMap = ['assigned', 'picked_up', 'out_for_delivery'].contains(status) &&
        _driverLatLng != null;

    return Scaffold(
      appBar: AppBar(title: Text('Order #PVL${widget.orderId}')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            if (showMap) ...[
              SizedBox(
                height: 220,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  child: FlutterMap(
                    options: MapOptions(
                      initialCenter: _driverLatLng!,
                      initialZoom: 14,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.pvlcommerce.customer',
                      ),
                      MarkerLayer(markers: [
                        Marker(
                          point: _driverLatLng!,
                          width: 44,
                          height: 44,
                          child: const Icon(Icons.delivery_dining, color: Colors.blue, size: 40),
                        ),
                      ]),
                    ],
                  ),
                ),
              ),
              if (_etaMinutes != null) ...[
                const SizedBox(height: AppSpacing.md),
                Card(
                  color: const Color(0xFFE6F4EA),
                  child: ListTile(
                    leading: const Icon(Icons.schedule_rounded, color: AppColors.brandDark),
                    title: Text(
                      'Arriving in ~$_etaMinutes min',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: Text('${_distanceKm!.toStringAsFixed(2)} km away'),
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
            ],
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Order status',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                    const SizedBox(height: AppSpacing.md),
                    for (final step in _kSteps) _timelineRow(step),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            _summaryCard(),
            const SizedBox(height: AppSpacing.lg),
            _itemsCard(),
          ],
        ),
      ),
    );
  }

  Widget _timelineRow(Map<String, Object> step) {
    final done = _stepDone(step['key'] as String);
    final time = _stepTime(step['key'] as String);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: done ? AppColors.brandDark : Colors.grey.shade300,
              shape: BoxShape.circle,
            ),
            child: Icon(
              step['icon'] as IconData,
              size: 16,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step['label'] as String,
                  style: TextStyle(
                    fontWeight: done ? FontWeight.w700 : FontWeight.w500,
                    color: done ? AppColors.ink : AppColors.inkMuted,
                  ),
                ),
                if (time != null)
                  Text(_fmtTime(time),
                      style: const TextStyle(fontSize: 11, color: AppColors.inkMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _fmtTime(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }

  Widget _summaryCard() {
    final o = _order!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Delivery to', style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: AppSpacing.xs),
            Text('${o['full_address'] ?? o['address'] ?? ''}'),
            Text('${o['city'] ?? ''} ${o['pincode'] ?? ''}'),
            const Divider(height: AppSpacing.xl),
            Row(children: [
              const Text('Total'),
              const Spacer(),
              Text('Rs. ${o['total_amount'] ?? o['total'] ?? 0}',
                  style: const TextStyle(fontWeight: FontWeight.w800)),
            ]),
            const SizedBox(height: AppSpacing.xs),
            Row(children: [
              const Text('Payment'),
              const Spacer(),
              Text('${o['payment_method'] ?? ''} • ${o['payment_status'] ?? ''}'),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _itemsCard() {
    final items = (_order?['items'] as List?) ?? [];
    if (items.isEmpty) return const SizedBox.shrink();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Items', style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: AppSpacing.sm),
            ...items.map((e) {
              final m = Map<String, dynamic>.from(e as Map);
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(children: [
                  Expanded(child: Text('${m['quantity']} x ${m['product_name'] ?? m['name'] ?? 'Item'}')),
                  Text('Rs. ${m['total_price'] ?? m['price'] ?? 0}'),
                ]),
              );
            }),
          ],
        ),
      ),
    );
  }
}
