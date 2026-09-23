import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/pvl_design.dart';

/// Driver marker for navigation — big, arrow-backed, rotates with heading.
class NavDriverMarker extends StatelessWidget {
  final double heading; // degrees, 0=north
  const NavDriverMarker({super.key, this.heading = 0});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 84, height: 84,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // FOV cone ahead of the driver
          AnimatedRotation(
            turns: heading / 360.0,
            duration: const Duration(milliseconds: 700),
            curve: Curves.easeOutCubic,
            child: Transform.translate(
              offset: const Offset(0, -14),
              child: CustomPaint(
                size: const Size(64, 64),
                painter: _FovPainter(),
              ),
            ),
          ),
          // Heading arrow
          AnimatedRotation(
            turns: heading / 360.0,
            duration: const Duration(milliseconds: 700),
            curve: Curves.easeOutCubic,
            child: Transform.translate(
              offset: const Offset(0, -22),
              child: CustomPaint(
                size: const Size(22, 22),
                painter: _ArrowPainter(),
              ),
            ),
          ),
          // Vehicle bubble
          Container(
            width: 52, height: 52,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF34D399), Color(0xFF047857)],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 4),
              boxShadow: PVL.strongShadow,
            ),
            child: const Icon(Icons.delivery_dining, color: Colors.white, size: 28),
          ),
        ],
      ),
    );
  }
}

/// Pin-shaped destination marker.
class NavDestinationMarker extends StatelessWidget {
  final String label;
  const NavDestinationMarker({super.key, this.label = 'Customer'});
  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: PVL.navBlue,
            borderRadius: BorderRadius.circular(6),
            boxShadow: PVL.softShadow,
          ),
          child: Text(label,
              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
        ),
        const SizedBox(height: 3),
        SizedBox(
          width: 44, height: 46,
          child: Stack(
            alignment: Alignment.topCenter,
            children: [
              Positioned(
                bottom: 0,
                child: CustomPaint(size: const Size(16, 16), painter: _PinTailPainter(color: PVL.navBlue)),
              ),
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: PVL.navBlue,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 3),
                  boxShadow: PVL.strongShadow,
                ),
                child: const Icon(Icons.flag_rounded, color: Colors.white, size: 20),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PinTailPainter extends CustomPainter {
  final Color color;
  _PinTailPainter({required this.color});
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..color = color;
    final path = Path()
      ..moveTo(0, 0)..lineTo(size.width, 0)..lineTo(size.width / 2, size.height)..close();
    canvas.drawPath(path, p);
  }
  @override
  bool shouldRepaint(_PinTailPainter old) => old.color != color;
}

class _ArrowPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..color = PVL.greenDark;
    final path = Path()
      ..moveTo(size.width / 2, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(size.width / 2, size.height * 0.7)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(path, p);
  }
  @override
  bool shouldRepaint(_ArrowPainter old) => false;
}

class _FovPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..shader = RadialGradient(
        colors: [PVL.green.withValues(alpha: 0.28), PVL.green.withValues(alpha: 0.0)],
        stops: const [0.0, 1.0],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    final path = Path()
      ..moveTo(size.width / 2, size.height * 0.9)
      ..lineTo(0, size.height * 0.1)
      ..lineTo(size.width, size.height * 0.1)
      ..close();
    canvas.drawPath(path, p);
  }
  @override
  bool shouldRepaint(_FovPainter old) => false;
}

double lerpAngle(double a, double b, double t) {
  final diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
}

double bearingBetween(double lat1, double lng1, double lat2, double lng2) {
  final dLon = (lng2 - lng1) * math.pi / 180.0;
  final y = math.sin(dLon) * math.cos(lat2 * math.pi / 180.0);
  final x = math.cos(lat1 * math.pi / 180.0) * math.sin(lat2 * math.pi / 180.0) -
            math.sin(lat1 * math.pi / 180.0) * math.cos(lat2 * math.pi / 180.0) * math.cos(dLon);
  final brng = math.atan2(y, x) * 180.0 / math.pi;
  return (brng + 360) % 360;
}
