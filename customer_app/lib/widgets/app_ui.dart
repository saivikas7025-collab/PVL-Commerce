import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SectionHeading extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  const SectionHeading({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.3,
                ),
          ),
        ),
        if (actionLabel != null)
          TextButton(
            onPressed: onAction,
            child: Text(
              actionLabel!,
              style: const TextStyle(
                color: AppColors.brandDark,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
      ],
    );
  }
}

class AppErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const AppErrorState({
    super.key,
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: AppColors.surfaceSecondary,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.cloud_off_outlined, color: AppColors.inkMuted, size: 32),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Something went wrong',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.inkMuted, height: 1.4),
            ),
            const SizedBox(height: AppSpacing.xl),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}

class AppEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  const AppEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 82,
              height: 82,
              decoration: const BoxDecoration(
                color: AppColors.brandSoft,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: AppColors.brandDark, size: 38),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.inkMuted, height: 1.4),
            ),
            if (actionLabel != null) ...[
              const SizedBox(height: AppSpacing.xl),
              FilledButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}

/// Product image tile.
///
/// If an emoji + pastel color are provided, renders a clean icon tile
/// (matches the category grid). Otherwise falls back to the network image,
/// and if that fails, to a generic basket icon.
class ProductImage extends StatelessWidget {
  final String? imageUrl;
  final String? icon;
  final Color? bgColor;
  final double? size;
  final double? iconSize;

  const ProductImage({
    super.key,
    this.imageUrl,
    this.icon,
    this.bgColor,
    this.size,
    this.iconSize,
  });

  @override
  Widget build(BuildContext context) {
    // Prefer emoji tile if we have one — it always renders.
    if (icon != null && icon!.isNotEmpty) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: bgColor ?? AppColors.surfaceSecondary,
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Center(
          child: Text(
            icon!,
            style: TextStyle(fontSize: iconSize ?? 46),
          ),
        ),
      );
    }

    // Fallback to network image
    final box = size ?? double.infinity;
    return Container(
      width: box,
      height: box,
      decoration: BoxDecoration(
        color: AppColors.surfaceSecondary,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: imageUrl != null && imageUrl!.isNotEmpty
          ? ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.md),
              child: Image.network(
                imageUrl!,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => _placeholder(),
              ),
            )
          : _placeholder(),
    );
  }

  Widget _placeholder() {
    return const Center(
      child: Icon(Icons.shopping_basket_outlined,
          color: AppColors.brandPrimary, size: 34),
    );
  }
}
