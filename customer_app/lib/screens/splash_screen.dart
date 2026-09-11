import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';
import 'home_screen.dart';
import 'login_screen.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.isLoading) return const _SplashContent();
    return auth.isLoggedIn ? const HomeScreen() : const LoginScreen();
  }
}

class _SplashContent extends StatelessWidget {
  const _SplashContent();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.brandDark,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                boxShadow: const [
                  BoxShadow(
                      color: Color(0x26000000),
                      blurRadius: 24,
                      offset: Offset(0, 10)),
                ],
              ),
              child: const Icon(Icons.shopping_basket_rounded,
                  color: AppColors.brandDark, size: 46),
            ),
            const SizedBox(height: AppSpacing.xl),
            const Text('PVL Mart',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 30,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: AppSpacing.sm),
            const Text('Fresh groceries. Delivered fast.',
                style: TextStyle(color: Colors.white70)),
            const SizedBox(height: AppSpacing.xxl),
            const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                    color: Colors.white, strokeWidth: 2.5)),
          ],
        ),
      ),
    );
  }
}