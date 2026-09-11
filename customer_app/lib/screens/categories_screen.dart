import 'package:flutter/material.dart';
import '../models/category.dart';
import '../models/product.dart';
import '../services/category_service.dart';
import '../services/product_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_ui.dart';
import '../widgets/product_card.dart';

class CategoriesScreen extends StatefulWidget {
  final int? initialCategory;

  const CategoriesScreen({super.key, this.initialCategory});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  List<Category> _categories = [];
  List<Product> _products = [];
  int? _selectedCategoryId;
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _selectedCategoryId = widget.initialCategory;
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await Future.wait([
        CategoryService.getCategories(),
        ProductService.getProducts(),
      ]);
      if (!mounted) return;
      final categories = result[0] as List<Category>;
      setState(() {
        _categories = categories;
        _products = result[1] as List<Product>;
        _selectedCategoryId ??= categories.isEmpty ? null : categories.first.id;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'We couldn’t load categories right now.';
      });
    }
  }

  List<Product> get _filteredProducts {
    final query = _query.trim().toLowerCase();
    return _products.where((product) {
      final matchesCategory = _selectedCategoryId == null ||
          product.categoryId == _selectedCategoryId;
      final matchesQuery = query.isEmpty ||
          product.name.toLowerCase().contains(query) ||
          product.unit.toLowerCase().contains(query);
      return matchesCategory && matchesQuery;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Scaffold(body: AppErrorState(message: _error!, onRetry: _loadData));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Browse categories')),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 720;
            return wide ? _wideLayout() : _mobileLayout();
          },
        ),
      ),
    );
  }

  Widget _mobileLayout() {
    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverToBoxAdapter(child: _searchField()),
        SliverToBoxAdapter(child: _categoryRail(horizontal: true)),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.xl, AppSpacing.lg, AppSpacing.md),
            child: SectionHeading(title: _selectedName),
          ),
        ),
        _productGridSliver(),
        const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxl)),
      ],
    );
  }

  Widget _wideLayout() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 240, child: _categoryRail(horizontal: false)),
        Expanded(
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(child: _searchField()),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.md),
                  child: SectionHeading(title: _selectedName),
                ),
              ),
              _productGridSliver(),
            ],
          ),
        ),
      ],
    );
  }

  String get _selectedName {
    for (final category in _categories) {
      if (category.id == _selectedCategoryId) return category.name;
    }
    return 'All products';
  }

  Widget _searchField() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 0),
      child: TextField(
        onChanged: (value) => setState(() => _query = value),
        decoration: const InputDecoration(
          hintText: 'Search within groceries',
          prefixIcon: Icon(Icons.search_rounded),
        ),
      ),
    );
  }

  Widget _categoryRail({required bool horizontal}) {
    final children = [
      _categoryTile(null, 'All products', _products.length),
      ..._categories.map(
        (category) => _categoryTile(
          category.id,
          category.name,
          _products.where((p) => p.categoryId == category.id).length,
        ),
      ),
    ];

    if (horizontal) {
      return SizedBox(
        height: 108,
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.xl, AppSpacing.lg, 0),
          scrollDirection: Axis.horizontal,
          itemCount: children.length,
          separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
          itemBuilder: (_, index) => children[index],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: children,
    );
  }

  Widget _categoryTile(int? id, String name, int count) {
    final selected = id == _selectedCategoryId ||
        (id == null && _selectedCategoryId == null);
    return SizedBox(
      width: 120,
      child: Material(
        color: selected ? AppColors.brandSoft : Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.md),
          onTap: () => setState(() => _selectedCategoryId = id),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  _iconForCategory(name),
                  color: selected ? AppColors.brandDark : AppColors.inkMuted,
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                const SizedBox(height: AppSpacing.xs),
                Text('$count items', style: const TextStyle(fontSize: 10, color: AppColors.inkMuted)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _productGridSliver() {
    if (_filteredProducts.isEmpty) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: AppEmptyState(
          icon: Icons.search_off_rounded,
          title: 'No products found',
          message: 'Try another category or search term.',
        ),
      );
    }
    return SliverLayoutBuilder(
      builder: (context, constraints) {
        final count = constraints.crossAxisExtent >= 1000
            ? 4
            : constraints.crossAxisExtent >= 650
                ? 3
                : 2;
        return SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
          sliver: SliverGrid.builder(
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: count,
              crossAxisSpacing: AppSpacing.md,
              mainAxisSpacing: AppSpacing.md,
              childAspectRatio: 0.68,
            ),
            itemCount: _filteredProducts.length,
            itemBuilder: (_, index) => ProductCard(product: _filteredProducts[index]),
          ),
        );
      },
    );
  }

  IconData _iconForCategory(String name) {
    final value = name.toLowerCase();
    if (value.contains('fruit') || value.contains('vegetable')) return Icons.eco_outlined;
    if (value.contains('dairy') || value.contains('breakfast')) return Icons.breakfast_dining_outlined;
    if (value.contains('snack') || value.contains('drink')) return Icons.local_cafe_outlined;
    if (value.contains('beauty') || value.contains('personal')) return Icons.spa_outlined;
    if (value.contains('house')) return Icons.cleaning_services_outlined;
    return Icons.category_outlined;
  }
}