import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';

import 'firebase_options.dart';
import 'providers/address_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/cart_provider.dart';
import 'screens/splash_screen.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase (best-effort — the app falls back to
  // phone/password login if Firebase is unavailable).
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    debugPrint('[PVL] Firebase initialized');
  } catch (e, st) {
    debugPrint('[PVL] Firebase init failed: $e');
    debugPrint('$st');
  }

  runApp(const PVLMartApp());
}

class PVLMartApp extends StatelessWidget {
  const PVLMartApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..checkAuth()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => AddressProvider()),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'PVL Mart',
        theme: AppTheme.light(),
        home: const SplashScreen(),
      ),
    );
  }
}
