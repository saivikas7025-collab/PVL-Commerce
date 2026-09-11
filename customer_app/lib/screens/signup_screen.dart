import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import 'auth_flow.dart';

class SignupScreen extends StatefulWidget {
  final String? initialPhone;

  const SignupScreen({super.key, this.initialPhone});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _otpController = TextEditingController();
  bool _hidePassword = true;
  bool _loading = false;
  bool _otpSent = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _phoneController.text = widget.initialPhone ?? '';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    if (_phoneController.text.trim().isEmpty) {
      setState(() => _error = 'Enter your phone number.');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await AuthService.sendOtp(phone: _phoneController.text.trim());
      if (mounted) setState(() => _otpSent = true);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _signup() async {
    final fields = [
      _nameController.text.trim(),
      _phoneController.text.trim(),
      _emailController.text.trim(),
      _passwordController.text,
      _otpController.text.trim(),
    ];
    if (fields.any((field) => field.isEmpty)) {
      setState(() => _error = 'Complete all fields to create your account.');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await context.read<AuthProvider>().signup(name: fields[0], phone: fields[1], email: fields[2], password: fields[3], otp: fields[4]);
      if (mounted) finishAuthFlow(context);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Join PVL Mart', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: AppSpacing.sm),
                const Text('Create an account for faster grocery shopping.', style: TextStyle(color: AppColors.inkMuted)),
                const SizedBox(height: AppSpacing.xxl),
                TextField(controller: _nameController, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline))),
                const SizedBox(height: AppSpacing.md),
                TextField(controller: _phoneController, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone number', prefixIcon: Icon(Icons.phone_outlined))),
                const SizedBox(height: AppSpacing.md),
                TextField(controller: _emailController, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email address', prefixIcon: Icon(Icons.email_outlined))),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: _passwordController,
                  obscureText: _hidePassword,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(tooltip: _hidePassword ? 'Show password' : 'Hide password', onPressed: () => setState(() => _hidePassword = !_hidePassword), icon: Icon(_hidePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined)),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                if (!_otpSent)
                  OutlinedButton(onPressed: _loading ? null : _sendOtp, child: const Text('Send verification code'))
                else ...[
                  TextField(controller: _otpController, keyboardType: TextInputType.number, maxLength: 6, decoration: const InputDecoration(labelText: '6-digit OTP', prefixIcon: Icon(Icons.verified_outlined), counterText: '')),
                  const SizedBox(height: AppSpacing.sm),
                  Align(alignment: Alignment.centerRight, child: TextButton(onPressed: _loading ? null : _sendOtp, child: const Text('Resend code'))),
                ],
                if (_error != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  Text(_error!, style: const TextStyle(color: AppColors.error)),
                ],
                const SizedBox(height: AppSpacing.lg),
                FilledButton(onPressed: !_otpSent || _loading ? null : _signup, child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Create account')),
              ],
            ),
          ),
        ),
      ),
    );
  }
}