import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  bool _isLoading = true;
  bool _isLoggedIn = false;

  bool get isLoading => _isLoading;
  bool get isLoggedIn => _isLoggedIn;

  /// Called on app start-up to decide whether to open the tabbed home
  /// or the login screen.
  Future<void> checkAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      _isLoggedIn = await AuthService.validateSession();
    } catch (_) {
      _isLoggedIn = false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> login(String phone, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      await AuthService.login(phone: phone, password: password);
      _isLoggedIn = true;
    } catch (e) {
      _isLoggedIn = false;
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signup({
    required String name,
    required String phone,
    required String email,
    required String password,
    required String otp,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      await AuthService.signup(
        name: name,
        phone: phone,
        email: email,
        password: password,
        otp: otp,
      );
      _isLoggedIn = true;
    } catch (e) {
      _isLoggedIn = false;
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Mark the user as signed in without hitting the network again.
  /// Used by the OTP verification flow.
  void markLoggedIn() {
    _isLoggedIn = true;
    _isLoading = false;
    notifyListeners();
  }

  Future<void> logout() async {
    await AuthService.logout();
    _isLoggedIn = false;
    notifyListeners();
  }
}
