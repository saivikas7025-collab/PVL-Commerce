import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/product.dart';
import '../providers/auth_provider.dart';
import '../providers/cart_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/app_ui.dart';
import 'auth_flow.dart';
import 'cart_screen.dart';
import 'login_screen.dart';

class ProductDetailScreen extends StatelessWidget {
  final Product product;

  const ProductDetailScreen({super.key, required this.product});

  Future<void> _addToCart(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    if (!auth.isLoggedIn) {
      await pushAuthScreen<void>(context, const LoginScreen());
      // ignore: use_build_context_synchronously
      if (!context.read<AuthProvider>().isLoggedIn) return;
    }
    // ignore: use_build_context_synchronously
    context.read<CartProvider>().add(product);
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final quantity = cart.quantityFor(product);
    final hasDiscount = product.originalPrice != null &&
        product.originalPrice! > product.price;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Product details'),
        actions: [
          IconButton(
            tooltip: 'Open cart',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const CartScreen()),
            ),
            icon: const Icon(Icons.shopping_bag_outlined),
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final imageHeight = constraints.maxWidth > 700 ? 380.0 : 280.0;
          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.sm,
              AppSpacing.lg,
              120,
            ),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 760),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: double.infinity,
                      height: imageHeight,
                      child: ProductImage(imageUrl: product.imageUrl, icon: product.resolvedIcon, bgColor: product.resolvedBgColor, iconSize: 96),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            product.name,
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.5,
                                ),
                          ),
                        ),
                        if (hasDiscount)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.sm,
                              vertical: AppSpacing.xs,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.brandSoft,
                              borderRadius:
                                  BorderRadius.circular(AppRadius.sm),
                            ),
                            child: const Text(
                              'Great value',
                              style: TextStyle(
                                color: AppColors.brandDark,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      product.unit.isEmpty ? 'Everyday essential' : product.unit,
                      style: const TextStyle(color: AppColors.inkMuted),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Row(
                      children: [
                        Text(
                          '₹${product.price.toStringAsFixed(0)}',
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(
                                color: AppColors.brandDark,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        if (hasDiscount) ...[
                          const SizedBox(width: AppSpacing.md),
                          Text(
                            '₹${product.originalPrice!.toStringAsFixed(0)}',
                            style: const TextStyle(
                              color: AppColors.inkMuted,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    _InfoCard(
                      title: 'About this product',
                      child: Text(
                        product.description.isEmpty
                            ? 'Fresh, quality essentials selected for your everyday needs.'
                            : product.description,
                        style: const TextStyle(
                            color: AppColors.inkMuted, height: 1.5),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    _InfoCard(
                      title: 'Delivery promise',
                      child: const Row(
                        children: [
                          Icon(Icons.bolt_rounded, color: AppColors.warning),
                          SizedBox(width: AppSpacing.sm),
                          Expanded(
                              child: Text(
                                  'Fast delivery to your selected address')),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),
                    if (quantity > 0)
                      Center(
                          child: Text('$quantity in your cart',
                              style: const TextStyle(
                                  color: AppColors.brandDark,
                                  fontWeight: FontWeight.w700))),
                  ],
                ),
              ),
            ),
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.all(AppSpacing.lg),
        child: Row(
          children: [
            if (quantity > 0) ...[
              _RoundAction(
                icon: Icons.remove,
                label: 'Decrease quantity',
                onPressed: () => cart.decrease(product),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg),
                child: Text('$quantity',
                    style: const TextStyle(
                        fontSize: 17, fontWeight: FontWeight.w800)),
              ),
              _RoundAction(
                icon: Icons.add,
                label: 'Increase quantity',
                onPressed: () => _addToCart(context),
              ),
              const SizedBox(width: AppSpacing.md),
            ],
            Expanded(
              child: FilledButton.icon(
                onPressed: () => _addToCart(context),
                icon: const Icon(Icons.shopping_bag_outlined),
                label: Text(quantity > 0 ? 'Add another' : 'Add to cart'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _InfoCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: AppSpacing.md),
            child,
          ],
        ),
      ),
    );
  }
}

class _RoundAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  const _RoundAction(
      {required this.icon, required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      button: true,
      child: IconButton.filledTonal(
        tooltip: label,
        onPressed: onPressed,
        icon: Icon(icon),
        constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
      ),
    );
  }
}
