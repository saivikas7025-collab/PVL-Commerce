import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../theme/pvl_design.dart';
import '../widgets/nav_marker.dart';

enum NavInstruction { turnLeft, turnRight, slightLeft, slightRight, uTurn, continueStraight, roundabout, arrive }

class _Step {
  final NavInstruction kind;
  final String road;
  final int distanceMeters;
  const _Step(this.kind, this.road, this.distanceMeters);
}

class DriverLiveNavigationScreen extends StatefulWidget {
  final int orderId;
  final String destinationLabel;
  final LatLng? pickup;
  final LatLng? destination;

  const DriverLiveNavigationScreen({
    super.key,
    required this.orderId,
    this.destinationLabel = 'Customer',
    this.pickup,
    this.destination,
  });

  static void show(BuildContext context, {
    required int orderId,
    String label = 'Customer',
    LatLng? pickup,
    LatLng? destination,
  }) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => DriverLiveNavigationScreen(
        orderId: orderId, destinationLabel: label, pickup: pickup, destination: destination,
      ),
    ));
  }

  @override
  State<DriverLiveNavigationScreen> createState() => _DriverLiveNavigationScreenState();
}

class _DriverLiveNavigationScreenState extends State<DriverLiveNavigationScreen> with TickerProviderStateMixin {
  final MapController _map = MapController();
  late final AnimationController _markerCtrl;

  // Route — mock two-leg route from a start point to destination through a midpoint
  late List<LatLng> _route;
  late List<LatLng> _completedRoute;
  late List<LatLng> _remainingRoute;

  // Driver position + heading
  LatLng _driverPos = const LatLng(17.3850, 78.4867);
  LatLng _driverFrom = const LatLng(17.3850, 78.4867);
  LatLng _driverTo = const LatLng(17.3850, 78.4867);
  double _heading = 0;
  double _headingFrom = 0;
  double _headingTo = 0;
  double _speedKph = 0;

  // Progress along the route (0..1)
  double _progress = 0.0;
  double _distanceRemainingKm = 2.4;
  int _etaMinutes = 7;

  // Camera mode
  bool _autoFollow = true;

  // UI state
  bool _arrived = false;
  bool _rerouting = false;
  bool _gpsWeak = false;
  bool _offline = false;

  // Mock maneuver queue
  final List<_Step> _steps = const [
    _Step(NavInstruction.turnLeft,        'KPHB Main Road',  250),
    _Step(NavInstruction.continueStraight,'Miyapur Rd',      600),
    _Step(NavInstruction.roundabout,      'Take exit 2',      400),
    _Step(NavInstruction.turnRight,       'Nizampet Rd',      350),
    _Step(NavInstruction.arrive,          'Destination',      120),
  ];
  int _currentStep = 0;

  Timer? _mover;
  Timer? _speedNoiseTimer;

  @override
  void initState() {
    super.initState();

    // Build a soft, curvy route — behaves like real roads visually
    final start = widget.pickup ?? const LatLng(17.4483, 78.3915);
    final end = widget.destination ?? const LatLng(17.4239, 78.4738);
    _route = _curve(start, end, 40);

    _driverPos = _route.first;
    _driverFrom = _driverPos;
    _driverTo = _driverPos;

    _markerCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))
      ..addListener(_onTick);

    // Kick off mock motion
    _startMock();
  }

  @override
  void dispose() {
    _mover?.cancel();
    _speedNoiseTimer?.cancel();
    _markerCtrl.dispose();
    super.dispose();
  }

  // ============================================================
  //  Route generation (soft curved polyline mimicking roads)
  // ============================================================
  List<LatLng> _curve(LatLng a, LatLng b, int segments) {
    final pts = <LatLng>[];
    final dLat = b.latitude - a.latitude;
    final dLng = b.longitude - a.longitude;
    for (int i = 0; i <= segments; i++) {
      final t = i / segments;
      // Add sinusoidal perpendicular wobble so it doesn't look like a straight line
      final wobble = 0.0008 * math.sin(t * math.pi * 3);
      pts.add(LatLng(
        a.latitude + dLat * t + wobble,
        a.longitude + dLng * t - wobble * 0.6,
      ));
    }
    return pts;
  }

  // ============================================================
  //  Motion
  // ============================================================
  void _startMock() {
    // Move driver along the route, slowly, looping
    _mover = Timer.periodic(const Duration(seconds: 3), (_) {
      if (!mounted || _arrived) return;
      _progress = (_progress + 0.025).clamp(0.0, 1.0);
      if (_progress >= 1.0) {
        _progress = 1.0;
        if (!_arrived) {
          setState(() => _arrived = true);
          _mover?.cancel();
          return;
        }
      }
      final idx = (_progress * (_route.length - 1)).floor().clamp(0, _route.length - 1);
      final next = _route[idx];
      final heading = bearingBetween(
        _driverPos.latitude, _driverPos.longitude,
        next.latitude, next.longitude,
      );
      _moveDriverTo(next, heading: heading);
      _updateRouteSplit();
      _updateInstruction();
      _updateEta();
      _pulseSpeed();
    });

    // Speed jitter for realism
    _speedNoiseTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (!mounted) return;
      setState(() => _speedKph = 22 + math.Random().nextInt(20).toDouble());
    });
  }

  void _moveDriverTo(LatLng target, {double? heading}) {
    _driverFrom = _driverPos;
    _driverTo = target;
    if (heading != null) {
      _headingFrom = _heading;
      _headingTo = heading;
    }
    _markerCtrl.forward(from: 0);
    if (_autoFollow) _followDriver();
  }

  void _onTick() {
    final t = Curves.easeOutCubic.transform(_markerCtrl.value);
    final lat = _driverFrom.latitude + (_driverTo.latitude - _driverFrom.latitude) * t;
    final lng = _driverFrom.longitude + (_driverTo.longitude - _driverFrom.longitude) * t;
    setState(() {
      _driverPos = LatLng(lat, lng);
      _heading = lerpAngle(_headingFrom, _headingTo, t);
    });
  }

  // ============================================================
  //  Route progress split (completed vs remaining)
  // ============================================================
  void _updateRouteSplit() {
    final driverIdx = (_progress * (_route.length - 1)).floor().clamp(0, _route.length - 1);
    setState(() {
      _completedRoute = _route.sublist(0, driverIdx + 1);
      _remainingRoute = _route.sublist(driverIdx);
    });
  }

  // ============================================================
  //  Instructions
  // ============================================================
  void _updateInstruction() {
    final stepBudget = 1.0 / _steps.length;
    final wanted = (_progress / stepBudget).floor().clamp(0, _steps.length - 1);
    if (wanted != _currentStep) setState(() => _currentStep = wanted);
  }

  // ============================================================
  //  ETA
  // ============================================================
  void _updateEta() {
    final remaining = (1 - _progress);
    setState(() {
      _distanceRemainingKm = (2.4 * remaining).clamp(0.05, 99);
      _etaMinutes = (7 * remaining).ceil().clamp(1, 60);
    });
  }

  void _pulseSpeed() {
    if (!mounted) return;
    setState(() => _speedKph = (25 + math.Random().nextDouble() * 15));
  }

  // ============================================================
  //  Camera
  // ============================================================
  void _followDriver() {
    final ahead = LatLng(
      _driverPos.latitude + (_driverTo.latitude - _driverPos.latitude) * 0.15,
      _driverPos.longitude + (_driverTo.longitude - _driverPos.longitude) * 0.15,
    );
    try {
      _map.move(ahead, 16);
    } catch (_) {}
  }

  void _recenter() {
    setState(() => _autoFollow = true);
    _followDriver();
  }

  void _zoom(double delta) {
    final z = _map.camera.zoom + delta;
    try { _map.move(_map.camera.center, z.clamp(4, 19)); } catch (_) {}
  }

  // ============================================================
  //  Instruction helpers
  // ============================================================
  IconData _iconFor(NavInstruction k) {
    switch (k) {
      case NavInstruction.turnLeft:        return Icons.turn_left;
      case NavInstruction.turnRight:       return Icons.turn_right;
      case NavInstruction.slightLeft:      return Icons.turn_slight_left;
      case NavInstruction.slightRight:     return Icons.turn_slight_right;
      case NavInstruction.uTurn:           return Icons.u_turn_left;
      case NavInstruction.continueStraight:return Icons.straight;
      case NavInstruction.roundabout:      return Icons.roundabout_left;
      case NavInstruction.arrive:          return Icons.flag;
    }
  }
  String _labelFor(NavInstruction k) {
    switch (k) {
      case NavInstruction.turnLeft:        return 'TURN LEFT';
      case NavInstruction.turnRight:       return 'TURN RIGHT';
      case NavInstruction.slightLeft:      return 'SLIGHT LEFT';
      case NavInstruction.slightRight:     return 'SLIGHT RIGHT';
      case NavInstruction.uTurn:           return 'U-TURN';
      case NavInstruction.continueStraight:return 'CONTINUE';
      case NavInstruction.roundabout:      return 'ROUNDABOUT';
      case NavInstruction.arrive:          return 'ARRIVE';
    }
  }

  // ============================================================
  //  UI
  // ============================================================
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PVL.bg,
      body: Stack(
        children: [
          _buildMap(),
          _buildHeader(),
          if (_rerouting) _buildReroutingBanner(),
          if (_offline || _gpsWeak) _buildStatusBanner(),
          _buildRightControls(),
          if (!_arrived) _buildBottomPanel(),
          if (_arrived) _buildArrivalCard(),
        ],
      ),
    );
  }

  Widget _buildMap() {
    return FlutterMap(
      mapController: _map,
      options: MapOptions(
        initialCenter: _driverPos,
        initialZoom: 16,
        minZoom: 4, maxZoom: 19,
        onPositionChanged: (pos, hasGesture) {
          if (hasGesture && _autoFollow) setState(() => _autoFollow = false);
        },
      ),
      children: [
        TileLayer(
          urlTemplate: pvlNavTileUrl,
          userAgentPackageName: 'com.pvl.mart',
          tileProvider: NetworkTileProvider(),
        ),
        // Completed portion of route (muted)
        if (_completedRoute.isNotEmpty)
          PolylineLayer(polylines: [
            Polyline(points: _completedRoute, strokeWidth: 6, color: const Color(0xFFCBD5E1)),
            Polyline(points: _completedRoute, strokeWidth: 2.5, color: Colors.white),
          ]),
        // Remaining portion (bright nav blue)
        if (_remainingRoute.isNotEmpty)
          PolylineLayer(polylines: [
            Polyline(points: _remainingRoute, strokeWidth: 8, color: PVL.navBlue),
            Polyline(points: _remainingRoute, strokeWidth: 3, color: Colors.white.withValues(alpha: 0.85)),
          ]),
        MarkerLayer(markers: [
          Marker(
            point: _route.last,
            width: 90, height: 66,
            alignment: Alignment.topCenter,
            child: NavDestinationMarker(label: widget.destinationLabel),
          ),
          Marker(
            point: _driverPos,
            width: 84, height: 84,
            alignment: Alignment.center,
            child: NavDriverMarker(heading: _heading),
          ),
        ]),
        const RichAttributionWidget(
          attributions: [TextSourceAttribution(pvlNavAttribution)],
        ),
      ],
    );
  }

  Widget _buildHeader() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            _circleBtn(Icons.arrow_back_ios_new_rounded, () => Navigator.pop(context)),
            const SizedBox(width: 10),
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(PVL.r16),
                  boxShadow: PVL.softShadow,
                ),
                child: Row(
                  children: [
                    const Icon(Icons.navigation, size: 18, color: PVL.navBlue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('NAVIGATING TO', style: PVL.overline),
                          Text(widget.destinationLabel,
                              style: PVL.h2, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 10),
            _circleBtn(Icons.more_vert, () => _showMenu()),
          ],
        ),
      ),
    );
  }

  Widget _circleBtn(IconData icon, VoidCallback onTap) {
    return Material(
      color: Colors.white,
      shape: const CircleBorder(),
      elevation: 4,
      shadowColor: Colors.black26,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(width: 46, height: 46, child: Icon(icon, size: 20, color: PVL.textDark)),
      ),
    );
  }

  Widget _buildStatusBanner() {
    return Positioned(
      top: 84, left: 12, right: 12,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: PVL.warning,
          borderRadius: BorderRadius.circular(PVL.r12),
          boxShadow: PVL.softShadow,
        ),
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, size: 16, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _offline ? 'Connection lost — showing last known location' : 'Waiting for GPS…',
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReroutingBanner() {
    return Positioned(
      top: 84, left: 12, right: 12,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: PVL.info,
          borderRadius: BorderRadius.circular(PVL.r12),
          boxShadow: PVL.softShadow,
        ),
        child: const Row(
          children: [
            SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
            SizedBox(width: 8),
            Text('Rerouting…',
                style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }

  Widget _buildRightControls() {
    return Positioned(
      right: 16,
      top: MediaQuery.of(context).size.height * 0.42,
      child: Column(
        children: [
          _zoomBtn(Icons.add, () => _zoom(1)),
          const SizedBox(height: 8),
          _zoomBtn(Icons.remove, () => _zoom(-1)),
          const SizedBox(height: 16),
          AnimatedOpacity(
            opacity: _autoFollow ? 0.0 : 1.0,
            duration: const Duration(milliseconds: 200),
            child: _circleBtn(Icons.my_location, _recenter),
          ),
        ],
      ),
    );
  }

  Widget _zoomBtn(IconData icon, VoidCallback onTap) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(PVL.r12),
      elevation: 3,
      shadowColor: Colors.black26,
      child: InkWell(
        borderRadius: BorderRadius.circular(PVL.r12),
        onTap: onTap,
        child: SizedBox(width: 46, height: 46, child: Icon(icon, size: 20, color: PVL.textDark)),
      ),
    );
  }

  Widget _buildBottomPanel() {
    final step = _steps[_currentStep];
    final isArrival = step.kind == NavInstruction.arrive;

    return Positioned(
      bottom: 0, left: 0, right: 0,
      child: SafeArea(
        top: false,
        child: Container(
          decoration: const BoxDecoration(
            color: PVL.navBlue,
            borderRadius: BorderRadius.vertical(top: Radius.circular(PVL.r24)),
            boxShadow: [BoxShadow(color: Colors.black38, blurRadius: 24, offset: Offset(0, -6))],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ---------- INSTRUCTION ----------
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      width: 60, height: 60,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(PVL.r16),
                      ),
                      child: Icon(_iconFor(step.kind), color: Colors.white, size: 34),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_labelFor(step.kind), style: PVL.instructionBig),
                          const SizedBox(height: 2),
                          Text(
                            isArrival
                                ? 'in ${step.distanceMeters} m'
                                : 'in ${step.distanceMeters} m · ${step.road}',
                            style: PVL.instructionSub.copyWith(color: Colors.white.withValues(alpha: 0.9)),
                            maxLines: 1, overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // ---------- ETA BAR ----------
              Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(PVL.r24)),
                ),
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
                child: SafeArea(
                  top: false,
                  child: Row(
                    children: [
                      _etaCell('ETA', _etaClock(), first: true),
                      _divider(),
                      _etaCell('DISTANCE', '${_distanceRemainingKm.toStringAsFixed(1)} km'),
                      _divider(),
                      _etaCell('TIME', '$_etaMinutes min'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _etaCell(String label, String value, {bool first = false}) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: PVL.overline),
          const SizedBox(height: 2),
          Text(value, style: PVL.etaBig),
        ],
      ),
    );
  }

  Widget _divider() {
    return Container(width: 1, height: 30, color: PVL.divider, margin: const EdgeInsets.symmetric(horizontal: 4));
  }

  Widget _buildArrivalCard() {
    return Positioned.fill(
      child: Container(
        color: Colors.black54,
        alignment: Alignment.bottomCenter,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(24, 26, 24, 24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(PVL.r24)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64, height: 64,
                  decoration: const BoxDecoration(color: PVL.greenSoft, shape: BoxShape.circle),
                  child: const Icon(Icons.flag_rounded, size: 32, color: PVL.greenDark),
                ),
                const SizedBox(height: 14),
                const Text("YOU'VE ARRIVED", style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.4)),
                const SizedBox(height: 4),
                Text(widget.destinationLabel, style: PVL.caption),
                const SizedBox(height: 6),
                const Text('120 m remaining',
                    style: TextStyle(fontSize: 13, color: PVL.textMuted, fontWeight: FontWeight.w600)),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: PVL.green,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(PVL.r16)),
                    ),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Arrival confirmed')),
                      );
                      Navigator.pop(context);
                    },
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Confirm Arrival',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _etaClock() {
    final now = DateTime.now().add(Duration(minutes: _etaMinutes));
    final h = now.hour % 12 == 0 ? 12 : now.hour % 12;
    final m = now.minute.toString().padLeft(2, '0');
    final ap = now.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ap';
  }

  void _showMenu() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(PVL.r16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.map_outlined),
              title: const Text('Route overview'),
              onTap: () { Navigator.pop(ctx); _fitRoute(); },
            ),
            ListTile(
              leading: const Icon(Icons.location_on_outlined),
              title: const Text('Destination details'),
              onTap: () => Navigator.pop(ctx),
            ),
            ListTile(
              leading: const Icon(Icons.report_outlined),
              title: const Text('Report navigation issue'),
              onTap: () => Navigator.pop(ctx),
            ),
            ListTile(
              leading: const Icon(Icons.exit_to_app),
              title: const Text('Exit navigation'),
              onTap: () { Navigator.pop(ctx); Navigator.pop(context); },
            ),
          ],
        ),
      ),
    );
  }

  void _fitRoute() {
    try {
      final bounds = LatLngBounds.fromPoints(_route);
      _map.fitCamera(CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(60)));
    } catch (_) {}
  }
}
