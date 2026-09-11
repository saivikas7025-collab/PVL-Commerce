import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import 'auth_flow.dart';
import 'signup_screen.dart';

class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _sent = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    if (_phoneController.text.trim().isEmpty) {
      setState(() => _error = 'Enter your phone number.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await AuthService.sendOtp(phone: _phoneController.text.trim());
      if (mounted) setState(() => _sent = true);
    } catch (error) {
      if (mounted) {
        setState(() =>
            _error = error.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    if (_otpController.text.trim().length != 6) {
      setState(() => _error = 'Enter the 6-digit OTP.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await AuthService.verifyOtp(
          phone: _phoneController.text.trim(),
          otp: _otpController.text.trim());
      if (!mounted) return;
      if (result['token'] != null) {
        // Token received -> user is fully logged in.
        context.read<AuthProvider>().markLoggedIn();
        finishAuthFlow(context);
      } else {
        // No token -> phone is verified but the user still needs to
        // complete the signup form. Replace OTP with Signup so back-nav
        // returns to the underlying screen, not to OTP.
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            settings: const RouteSettings(name: authRouteName),
            builder: (_) =>
                SignupScreen(initialPhone: _phoneController.text.trim()),
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        setState(() =>
            _error = error.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('OTP login')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.sms_outlined,
                    size: 60, color: AppColors.brandDark),
                const SizedBox(height: AppSpacing.xl),
                Text('Sign in with your phone',
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: AppSpacing.sm),
                const Text(
                    'We’ll send a one-time code to verify your number.',
                    style: TextStyle(color: AppColors.inkMuted)),
                const SizedBox(height: AppSpacing.xxl),
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                      labelText: 'Phone number',
                      prefixIcon: Icon(Icons.phone_outlined)),
                ),
                const SizedBox(height: AppSpacing.md),
                FilledButton(
                    onPressed: _loading ? null : _sendOtp,
                    child: _loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2))
                        : Text(_sent ? 'Resend OTP' : 'Send OTP')),
                if (_sent) ...[
                  const SizedBox(height: AppSpacing.xl),
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    decoration: const InputDecoration(
                      labelText: '6-digit OTP',
                      prefixIcon: Icon(Icons.verified_outlined),
                      counterText: '',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  OutlinedButton(
                      onPressed: _loading ? null : _verifyOtp,
                      child: const Text('Verify and continue')),
                ],
                if (_error != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  Text(_error!,
                      style: const TextStyle(color: AppColors.error)),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
