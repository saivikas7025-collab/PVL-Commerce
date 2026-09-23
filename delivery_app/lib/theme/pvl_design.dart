import 'package:flutter/material.dart';

class PVL {
  static const Color green = Color(0xFF10B981);
  static const Color greenDark = Color(0xFF047857);
  static const Color greenSoft = Color(0xFFECFDF5);

  static const Color textDark = Color(0xFF0F172A);
  static const Color textMuted = Color(0xFF64748B);
  static const Color bg = Color(0xFFF8FAFC);
  static const Color surface = Colors.white;
  static const Color border = Color(0xFFE2E8F0);
  static const Color divider = Color(0xFFEEF2F7);

  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);
  static const Color navBlue = Color(0xFF1D4ED8);

  static const double r8 = 8;
  static const double r12 = 12;
  static const double r16 = 16;
  static const double r24 = 24;

  static const double s4 = 4;
  static const double s8 = 8;
  static const double s12 = 12;
  static const double s16 = 16;
  static const double s24 = 24;
  static const double s32 = 32;

  static List<BoxShadow> get softShadow => [
    BoxShadow(color: const Color(0xFF0F172A).withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, 4)),
  ];
  static List<BoxShadow> get strongShadow => [
    BoxShadow(color: const Color(0xFF0F172A).withValues(alpha: 0.14), blurRadius: 20, offset: const Offset(0, 8)),
  ];

  static const TextStyle instructionBig = TextStyle(
    fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -0.8,
    color: Colors.white, height: 1.05,
  );
  static const TextStyle instructionSub = TextStyle(
    fontSize: 18, fontWeight: FontWeight.w600,
    color: Colors.white, height: 1.2,
  );
  static const TextStyle h1 = TextStyle(fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: -0.4, color: textDark);
  static const TextStyle h2 = TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: textDark);
  static const TextStyle body = TextStyle(fontSize: 14, color: textDark, height: 1.4);
  static const TextStyle caption = TextStyle(fontSize: 12, color: textMuted);
  static const TextStyle overline = TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.1, color: textMuted);
  static const TextStyle etaBig = TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: textDark, letterSpacing: -0.5);
}

const String pvlNavTileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const String pvlNavAttribution = '© OpenStreetMap · © CARTO';
