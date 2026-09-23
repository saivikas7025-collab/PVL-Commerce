// lib/widgets/pvl_logo.dart
// PVL Mart logo — pure-Flutter, no image file needed.
// Renders a green rounded square with a basket + "PVL" text.
// Size adapts via the `size` parameter.
import 'package:flutter/material.dart';

class PvlLogo extends StatelessWidget {
  final double size;
  final bool showWordmark;

  const PvlLogo({
    super.key,
    this.size = 48,
    this.showWordmark = false,
  });

  @override
  Widget build(BuildContext context) {
    final mark = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2E7D32), Color(0xFF1B5E20)],
        ),
        borderRadius: BorderRadius.circular(size * 0.24),
        boxShadow: [
          BoxShadow(
            color: const Color(0x332E7D32),
            blurRadius: size * 0.15,
            offset: Offset(0, size * 0.05),
          ),
        ],
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Icon(
            Icons.shopping_basket_rounded,
            color: Colors.white,
            size: size * 0.55,
          ),
          Positioned(
            bottom: size * 0.10,
            right: size * 0.10,
            child: Container(
              padding: EdgeInsets.symmetric(
                horizontal: size * 0.08,
                vertical: size * 0.02,
              ),
              decoration: BoxDecoration(
                color: const Color(0xFFFFB300),
                borderRadius: BorderRadius.circular(size * 0.06),
              ),
              child: Text(
                'PVL',
                style: TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.w900,
                  fontSize: size * 0.14,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
        ],
      ),
    );

    if (!showWordmark) return mark;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        mark,
        SizedBox(width: size * 0.2),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'PVL MART',
              style: TextStyle(
                fontSize: size * 0.42,
                fontWeight: FontWeight.w900,
                color: const Color(0xFF1B5E20),
                letterSpacing: 1.2,
              ),
            ),
            Text(
              'Store · OS',
              style: TextStyle(
                fontSize: size * 0.20,
                fontWeight: FontWeight.w500,
                color: const Color(0xFF6D6D6D),
                letterSpacing: 2.0,
              ),
            ),
          ],
        ),
      ],
    );
  }
}