import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/cart_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/app_ui.dart';
import 'auth_flow.dart';
import 'checkout_screen.dart';
import 'login_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<CartProvider>().hydrate();
    });
  }

  Future<void> _refresh() => context.read<CartProvider>().hydrate();

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final isLoggedIn = context.watch<AuthProvider>().isLoggedIn;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Your basket'),
        actions: [
          if (cart.items.isNotEmpty)
            TextButton(
              onPressed: cart.clear,
              child: const Text('Clear',
                  style: TextStyle(color: AppColors.error)),
            ),
        ],
      ),
      body: !isLoggedIn
          ? _signedOutState(context)
          : RefreshIndicator(
              onRefresh: _refresh,
              child: cart.items.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        SizedBox(
                          height:
                              MediaQuery.of(context).size.height * 0.55,
                          child: AppEmptyState(
                            icon: Icons.shopping_basket_outlined,
                            title: 'Your basket is empty',
                            message:
                                'Add everyday essentials and they will appear here.',
                            actionLabel: 'Start shopping',
                            onAction: () => Navigator.of(context).maybePop(),
                          ),
                        ),
                      ],
                    )
                  : ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(AppSpacing.lg,
                          AppSpacing.sm, AppSpacing.lg, 160),
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${cart.itemCount} items selected',
                                style: const TextStyle(
                                    color: AppColors.inkMuted),
                              ),
                            ),
                            if (cart.isSyncing)
                              const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2),
                              ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        ...cart.items
                            .map((item) => _CartItemTile(item: item)),
                        const SizedBox(height: AppSpacing.lg),
                        _BillSummary(cart: cart),
                        if (cart.lastError != null) ...[
                          const SizedBox(height: AppSpacing.md),
                          Text(cart.lastError!,
                              style:
                                  const TextStyle(color: AppColors.error)),
                        ],
                      ],
                    ),
            ),
      bottomNavigationBar: !isLoggedIn || cart.items.isEmpty
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(AppSpacing.lg,
                  AppSpacing.md, AppSpacing.lg, AppSpacing.lg),
              child: FilledButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CheckoutScreen()),
                ),
                child: Text('Proceed to checkout  •  ₹${cart.subtotal.toStringAsFixed(0)}'),
              ),
            ),
    );
  }

  Widget _signedOutState(BuildContext context) {
    return AppEmptyState(
      icon: Icons.lock_outline_rounded,
      title: 'Sign in to view your cart',
      message: 'Log in to keep your basket in sync across devices.',
      actionLabel: 'Log in',
      onAction: () => pushAuthScreen<void>(context, const LoginScreen()),
    );
  }
}

class _CartItemTile extends StatelessWidget {
  final CartItem item;

  const _CartItemTile({required this.item});

  @override
  Widget build(BuildContext context) {
    final cart = context.read<CartProvider>();
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
          children: [
            ProductImage(imageUrl: item.product.imageUrl, size: 76),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.product.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    item.product.unit.isEmpty
                        ? 'Standard pack'
                        : item.product.unit,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.inkMuted),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text('₹${item.total.toStringAsFixed(0)}',
                      style: const TextStyle(
                          color: AppColors.brandDark,
                          fontWeight: FontWeight.w800)),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            _Stepper(
              quantity: item.quantity,
              onDecrease: () => cart.decrease(item.product),
              onIncrease: () => cart.add(item.product),
            ),
          ],
        ),
      ),
    );
  }
}

class _Stepper extends StatelessWidget {
  final int quantity;
  final VoidCallback onDecrease;
  final VoidCallback onIncrease;

  const _Stepper(
      {required this.quantity,
      required this.onDecrease,
      required this.onIncrease});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.brandSoft,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
              onPressed: onDecrease,
              icon: const Icon(Icons.remove, size: 18),
              constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
              padding: EdgeInsets.zero,
              tooltip: 'Decrease quantity'),
          Text('$quantity',
              style: const TextStyle(fontWeight: FontWeight.w800)),
          IconButton(
              onPressed: onIncrease,
              icon: const Icon(Icons.add, size: 18),
              constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
              padding: EdgeInsets.zero,
              tooltip: 'Increase quantity'),
        ],
      ),
    );
  }
}

class _BillSummary extends StatelessWidget {
  final CartProvider cart;

  const _BillSummary({required this.cart});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          children: [
            const Align(
                alignment: Alignment.centerLeft,
                child: Text('Bill summary',
                    style: TextStyle(fontWeight: FontWeight.w800))),
            const SizedBox(height: AppSpacing.lg),
            _line('Item total', '₹${cart.subtotal.toStringAsFixed(0)}'),
            const SizedBox(height: AppSpacing.md),
            _line('Delivery fee', 'Calculated at checkout'),
            const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
                child: Divider(height: 1)),
            _line('Grand total', '₹${cart.subtotal.toStringAsFixed(0)}',
                strong: true),
          ],
        ),
      ),
    );
  }

  Widget _line(String label, String value, {bool strong = false}) {
    return Row(
      children: [
        Expanded(
            child: Text(label,
                style: TextStyle(
                    color: strong ? AppColors.ink : AppColors.inkMuted,
                    fontWeight:
                        strong ? FontWeight.w800 : FontWeight.w500))),
        Text(value,
            style: TextStyle(
                fontWeight: strong ? FontWeight.w800 : FontWeight.w600)),
      ],
    );
  }
}
