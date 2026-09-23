import 'package:flutter/material.dart';

/// PVL-Mart design system tokens.
/// Shared across live tracking, driver nav, admin map.
class PVL {
  // Brand
  static const Color green = Color(0xFF10B981);
  static const Color greenDark = Color(0xFF047857);
  static const Color greenSoft = Color(0xFFECFDF5);

  // Neutrals
  static const Color textDark = Color(0xFF0F172A);
  static const Color textMuted = Color(0xFF64748B);
  static const Color bg = Color(0xFFF8FAFC);
  static const Color surface = Colors.white;
  static const Color border = Color(0xFFE2E8F0);
  static const Color divider = Color(0xFFEEF2F7);

  // Accents
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);

  // Radii
  static const double r8 = 8;
  static const double r12 = 12;
  static const double r16 = 16;
  static const double r24 = 24;

  // Spacing
  static const double s4 = 4;
  static const double s8 = 8;
  static const double s12 = 12;
  static const double s16 = 16;
  static const double s24 = 24;
  static const double s32 = 32;

  // Shadow
  static List<BoxShadow> get softShadow => [
    BoxShadow(
      color: const Color(0xFF0F172A).withValues(alpha: 0.06),
      blurRadius: 12,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> get strongShadow => [
    BoxShadow(
      color: const Color(0xFF0F172A).withValues(alpha: 0.10),
      blurRadius: 20,
      offset: const Offset(0, 8),
    ),
  ];

  // Typography helpers
  static const TextStyle displayNumber = TextStyle(
    fontSize: 34,
    fontWeight: FontWeight.w700,
    letterSpacing: -1.2,
    color: textDark,
    height: 1.05,
  );

  static const TextStyle h1 = TextStyle(
    fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.5, color: textDark,
  );
  static const TextStyle h2 = TextStyle(
    fontSize: 17, fontWeight: FontWeight.w600, letterSpacing: -0.2, color: textDark,
  );
  static const TextStyle body = TextStyle(
    fontSize: 14, color: textDark, height: 1.4,
  );
  static const TextStyle caption = TextStyle(
    fontSize: 12, color: textMuted,
  );
  static const TextStyle overline = TextStyle(
    fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.1, color: textMuted,
  );
}

/// Map tile URL — CartoDB Positron (clean, light, free, no API key).
/// Looks similar to what Swiggy/Blinkit use.
const String pvlMapTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const String pvlMapAttribution = '© OpenStreetMap contributors · © CARTO';
