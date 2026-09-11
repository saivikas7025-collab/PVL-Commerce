import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/product.dart';
import '../providers/auth_provider.dart';
import '../providers/cart_provider.dart';
import '../screens/auth_flow.dart';
import '../screens/login_screen.dart';
import '../screens/product_detail_screen.dart';
import '../theme/app_theme.dart';
import 'app_ui.dart';

class ProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback? onTap;

  const ProductCard({super.key, required this.product, this.onTap});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final quantity = cart.quantityFor(product);
    final hasDiscount = product.originalPrice != null &&
        product.originalPrice! > product.price;
    final discount = hasDiscount
        ? ((product.originalPrice! - product.price) /
                product.originalPrice! *
            100).round()
        : 0;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap ??
            () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ProductDetailScreen(product: product),
                  ),
                ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.sm),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 5,
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: ProductImage(imageUrl: product.imageUrl),
                    ),
                    if (discount > 0)
                      Positioned(
                        left: AppSpacing.sm,
                        top: AppSpacing.sm,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: AppColors.brandDark,
                            borderRadius: BorderRadius.circular(AppRadius.sm),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.sm,
                              vertical: AppSpacing.xs,
                            ),
                            child: Text(
                              '$discount% off',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                product.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                product.unit.isEmpty ? 'Standard pack' : product.unit,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11, color: AppColors.inkMuted),
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Text(
                    '₹${product.price.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                  ),
                  if (hasDiscount) ...[
                    const SizedBox(width: AppSpacing.sm),
                    Text(
                      '₹${product.originalPrice!.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.inkMuted,
                        decoration: TextDecoration.lineThrough,
                      ),
                    ),
                  ],
                  const Spacer(),
                  _QuantityControl(product: product, quantity: quantity),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuantityControl extends StatelessWidget {
  final Product product;
  final int quantity;

  const _QuantityControl({required this.product, required this.quantity});

  Future<void> _handleAdd(BuildContext context) async {
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
    final cart = context.read<CartProvider>();
    if (quantity == 0) {
      return SizedBox(
        height: 40,
        child: OutlinedButton(
          onPressed: () => _handleAdd(context),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(58, 40),
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          ),
          child: const Text('ADD'),
        ),
      );
    }

    return Container(
      height: 40,
      decoration: BoxDecoration(
        color: AppColors.brandPrimary,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ControlButton(
            icon: Icons.remove,
            label: 'Decrease ${product.name}',
            onPressed: () => cart.decrease(product),
          ),
          Text(
            '$quantity',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
          ),
          _ControlButton(
            icon: Icons.add,
            label: 'Increase ${product.name}',
            onPressed: () => _handleAdd(context),
          ),
        ],
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  const _ControlButton({required this.icon, required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      button: true,
      child: IconButton(
        onPressed: onPressed,
        tooltip: label,
        icon: Icon(icon, color: Colors.white, size: 18),
        constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
        padding: EdgeInsets.zero,
      ),
    );
  }
}