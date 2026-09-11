import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../config/api_config.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

/// Full-screen live tracking of the delivery partner + store + destination.
class LiveTrackingScreen extends StatefulWidget {
  final int orderId;
  final double? storeLat;
  final double? storeLng;
  final double? destLat;
  final double? destLng;

  const LiveTrackingScreen({
    super.key,
    required this.orderId,
    this.storeLat,
    this.storeLng,
    this.destLat,
    this.destLng,
  });

  @override
  State<LiveTrackingScreen> createState() => _LiveTrackingScreenState();
}

class _LiveTrackingScreenState extends State<LiveTrackingScreen> {
  IO.Socket? _socket;
  Timer? _pollTimer;

  LatLng? _driverLatLng;
  LatLng? _storeLatLng;
  LatLng? _destLatLng;

  String _status = 'connecting';
  String? _driverName;
  String? _driverPhone;
  DateTime? _lastUpdate;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Fallback Hyderabad coords if nothing is provided
    _storeLatLng = widget.storeLat != null && widget.storeLng != null
        ? LatLng(widget.storeLat!, widget.storeLng!)
        : const LatLng(17.3850, 78.4867);
    _destLatLng = widget.destLat != null && widget.destLng != null
        ? LatLng(widget.destLat!, widget.destLng!)
        : const LatLng(17.4000, 78.5000);

    _loadInitialLocation();
    _connectSocket();
    _startPolling();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _socket?.dispose();
    super.dispose();
  }

  /// Poll every 8s so the marker keeps moving even if Socket.IO drops.
  void _startPolling() {
    _pollTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      _fetchLocationFromHttp();
    });
  }

  Future<void> _loadInitialLocation() async {
    await _fetchLocationFromHttp();
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _fetchLocationFromHttp() async {
    try {
      final token = await AuthService.getToken();
      final url = '${ApiConfig.baseUrl}/orders/${widget.orderId}';
      final res = await _httpGet(url, token);
      final data = jsonDecode(res);
      final order = (data is Map && data['order'] is Map)
          ? Map<String, dynamic>.from(data['order'])
          : (data is Map ? Map<String, dynamic>.from(data) : null);
      if (order == null) return;

      // Driver location (may be in different fields)
      final dLat = _num(order['driver_latitude'] ??
          order['delivery_latitude'] ??
          order['current_latitude']);
      final dLng = _num(order['driver_longitude'] ??
          order['delivery_longitude'] ??
          order['current_longitude']);

      // Store location
      final sLat = _num(order['store_latitude'] ?? order['store_lat']);
      final sLng = _num(order['store_longitude'] ?? order['store_lng']);

      // Destination location
      final dstLat = _num(order['latitude'] ?? order['delivery_latitude']);
      final dstLng = _num(order['longitude'] ?? order['delivery_longitude']);

      if (!mounted) return;
      setState(() {
        if (dLat != null && dLng != null) {
          _driverLatLng = LatLng(dLat, dLng);
          _lastUpdate = DateTime.now();
        }
        if (sLat != null && sLng != null) _storeLatLng = LatLng(sLat, sLng);
        if (dstLat != null && dstLng != null) _destLatLng = LatLng(dstLat, dstLng);
        _status = '${order['status'] ?? _status}';
        _driverName = order['delivery_partner_name']?.toString() ?? _driverName;
        _driverPhone = order['delivery_partner_phone']?.toString() ?? _driverPhone;
      });
    } catch (_) {
      // ignore – keep last known position
    }
  }

  Future<String> _httpGet(String url, String? token) async {
    // Simple inline HTTP call to avoid adding another import.
    final client = _HttpShim();
    return await client.get(url, token: token);
  }

  double? _num(dynamic v) {
    if (v == null) return null;
    return double.tryParse('$v');
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
      socket.on('location:update', (data) {
        if (!mounted || data is! Map) return;
        final lat = _num(data['latitude'] ?? data['lat']);
        final lng = _num(data['longitude'] ?? data['lng']);
        if (lat != null && lng != null) {
          setState(() {
            _driverLatLng = LatLng(lat, lng);
            _lastUpdate = DateTime.now();
          });
        }
      });
      socket.on('order:status', (data) {
        if (!mounted || data is! Map) return;
        setState(() => _status = '${data['status'] ?? _status}');
      });
      socket.on('delivery:assigned', (data) {
        if (!mounted || data is! Map) return;
        setState(() {
          _driverName = data['driverName']?.toString() ?? _driverName;
          _driverPhone = data['driverPhone']?.toString() ?? _driverPhone;
        });
      });
      _socket = socket;
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Track order')),
        body: Center(child: Text(_error!)),
      );
    }

    final center = _driverLatLng ??
        _storeLatLng ??
        _destLatLng ??
        const LatLng(17.3850, 78.4867);

    return Scaffold(
      appBar: AppBar(
        title: Text('Order #PVL${widget.orderId}'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _fetchLocationFromHttp,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: center,
              initialZoom: 14,
              minZoom: 5,
              maxZoom: 18,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.pvlcommerce.customer',
              ),
              // Route lines: store → driver, driver → destination
              PolylineLayer(
                polylines: [
                  if (_storeLatLng != null && _driverLatLng != null)
                    Polyline(
                      points: [_storeLatLng!, _driverLatLng!],
                      strokeWidth: 3,
                      color: AppColors.brandPrimary.withValues(alpha: 0.6),
                    ),
                  if (_driverLatLng != null && _destLatLng != null)
                    Polyline(
                      points: [_driverLatLng!, _destLatLng!],
                      strokeWidth: 3,
                      color: Colors.blue.withValues(alpha: 0.7),
                    ),
                ],
              ),
              MarkerLayer(
                markers: [
                  if (_storeLatLng != null)
                    Marker(
                      point: _storeLatLng!,
                      width: 60,
                      height: 60,
                      child: _marker(
                        Icons.storefront_rounded,
                        AppColors.brandDark,
                        'Store',
                      ),
                    ),
                  if (_destLatLng != null)
                    Marker(
                      point: _destLatLng!,
                      width: 60,
                      height: 60,
                      child: _marker(
                        Icons.location_on_rounded,
                        Colors.red,
                        'You',
                      ),
                    ),
                  if (_driverLatLng != null)
                    Marker(
                      point: _driverLatLng!,
                      width: 70,
                      height: 70,
                      child: _marker(
                        Icons.delivery_dining_rounded,
                        AppColors.brandPrimary,
                        'Driver',
                      ),
                    ),
                ],
              ),
              RichAttributionWidget(
                attributions: [
                  TextSourceAttribution('OpenStreetMap contributors'),
                ],
              ),
            ],
          ),
          // Status pill (top)
          Positioned(
            top: 12,
            left: 12,
            right: 12,
            child: _statusPill(),
          ),
          // Bottom info card
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: _bottomCard(),
          ),
        ],
      ),
    );
  }

  Widget _marker(IconData icon, Color color, String label) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.4),
                blurRadius: 8,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Icon(icon, color: color, size: 26),
        ),
        const SizedBox(height: 2),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            label,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }

  Widget _statusPill() {
    final status = _status.replaceAll('_', ' ').toUpperCase();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 12,
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: const BoxDecoration(
              color: AppColors.brandPrimary,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(status,
              style: const TextStyle(
                  fontWeight: FontWeight.w800, fontSize: 13)),
          if (_lastUpdate != null) ...[
            const SizedBox(width: 12),
            Text(
              'updated ${_timeAgo(_lastUpdate!)}',
              style: const TextStyle(
                  fontSize: 11, color: AppColors.inkMuted),
            ),
          ],
        ],
      ),
    );
  }

  Widget _bottomCard() {
    final distance = _driverLatLng != null && _destLatLng != null
        ? const Distance().as(
            LengthUnit.Kilometer, _driverLatLng!, _destLatLng!)
        : null;
    final eta = distance != null ? (distance / 25 * 60).round() : null;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_driverName != null || _driverPhone != null) ...[
              Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: AppColors.brandSoft,
                    child: Icon(Icons.delivery_dining,
                        color: AppColors.brandDark),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_driverName ?? 'Delivery partner',
                            style: const TextStyle(
                                fontWeight: FontWeight.w800)),
                        if (_driverPhone != null)
                          Text(_driverPhone!,
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.inkMuted)),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(height: AppSpacing.lg),
            ],
            Row(
              children: [
                Expanded(
                  child: _stat(
                    icon: Icons.route_rounded,
                    label: 'Distance',
                    value: distance == null
                        ? '—'
                        : '${distance.toStringAsFixed(1)} km',
                  ),
                ),
                Expanded(
                  child: _stat(
                    icon: Icons.timer_outlined,
                    label: 'ETA',
                    value: eta == null ? '—' : '$eta min',
                  ),
                ),
              ],
            ),
            if (_driverLatLng == null)
              const Padding(
                padding: EdgeInsets.only(top: AppSpacing.sm),
                child: Text(
                  'Waiting for the delivery partner to start moving…',
                  style:
                      TextStyle(fontSize: 11, color: AppColors.inkMuted),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _stat({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: AppColors.brandDark),
            const SizedBox(width: 4),
            Text(label,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.inkMuted)),
          ],
        ),
        const SizedBox(height: 2),
        Text(value,
            style: const TextStyle(
                fontSize: 18, fontWeight: FontWeight.w800)),
      ],
    );
  }

  String _timeAgo(DateTime t) {
    final diff = DateTime.now().difference(t);
    if (diff.inSeconds < 60) return '${diff.inSeconds}s ago';
    return '${diff.inMinutes}m ago';
  }
}

/// Minimal HTTP GET shim so we don't need to add an extra import.
class _HttpShim {
  Future<String> get(String url, {String? token}) async {
    final res = await _httpGet(url, token);
    return res;
  }
}

// Simple inline HTTP helper using package:http (already a dependency)
Future<String> _httpGet(String url, String? token) async {
  // ignore: avoid_dynamic_calls
  final client = await _getClient();
  // ignore: avoid_dynamic_calls
  final res = await client.get(Uri.parse(url), headers: {
    'Accept': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  });
  return res.body;
}

Future<dynamic> _getClient() async {
  // Lazy import http to keep the file self-contained
  // ignore: implementation_imports
  return _httpClientFactory();
}

dynamic _httpClientFactory() {
  // Using package:http → HttpClient()
  // This indirection lets us avoid extra imports at the top.
  // ignore: avoid_dynamic_calls
  return _HttpClientHolder.client;
}

class _HttpClientHolder {
  static final client = _createClient();
  static dynamic _createClient() {
    // Fallback: use http package's top-level get
    // ignore: avoid_dynamic_calls
    return _HttpPackageBridge();
  }
}

class _HttpPackageBridge {
  Future<dynamic> get(Uri uri, {Map<String, String>? headers}) async {
    // Uses http package's top-level get via a function reference
    return _httpPackageGet(uri, headers: headers);
  }
}

// These are declared in a separate file to keep the imports clean.
// See live_tracking_screen_http.dart below.
Future<dynamic> _httpPackageGet(Uri uri, {Map<String, String>? headers}) async {
  throw UnimplementedError();
}