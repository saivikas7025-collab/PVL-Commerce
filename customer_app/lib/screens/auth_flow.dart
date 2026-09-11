import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/cart_provider.dart';

/// Named-route marker attached to every auth screen we push.
///
/// Using a shared name lets [finishAuthFlow] pop *every* auth screen
/// (Login → OTP or Login → Signup) in one shot, without disturbing
/// whatever the user was doing underneath (Home tab, Product Details).
const authRouteName = 'pvl_auth';

/// Push an auth screen (Login / OTP / Signup) with the [authRouteName]
/// so [finishAuthFlow] can tear it down later.
///
/// Returns the future completed when the auth stack is popped — this lets
/// the caller (e.g. `HomeScreen._selectTab`) resume its logic once the
/// user is signed in.
Future<T?> pushAuthScreen<T>(BuildContext context, Widget screen) {
  return Navigator.of(context).push<T>(
    MaterialPageRoute(
      builder: (_) => screen,
      settings: const RouteSettings(name: authRouteName),
    ),
  );
}

/// Called when a sign-in / sign-up succeeds.
///
/// We hydrate the cart against the freshly-authenticated session, then pop
/// every route whose settings name matches [authRouteName]. That drops
/// Login (and OTP / Signup on top of it), while preserving the underlying
/// route the user was on — Home tab, a Product Details page, etc.
///
/// If Login is the *only* route in the navigator (first-launch flow —
/// SplashScreen watches AuthProvider and will re-render to HomeScreen),
/// [popUntil] stops on the first route so no extra work is needed.
void finishAuthFlow(BuildContext context) {
  context.read<CartProvider>().hydrate();
  final navigator = Navigator.of(context);
  navigator.popUntil((route) {
    if (route.isFirst) return true;
    return route.settings.name != authRouteName;
  });
}

/// Convenience wrapper used by the OTP screen where the token is set
/// directly (bypassing [AuthProvider.login]).
void markSessionAndFinish(BuildContext context) {
  context.read<AuthProvider>().markLoggedIn();
  finishAuthFlow(context);
}
