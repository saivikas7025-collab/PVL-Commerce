import 'package:flutter/material.dart';
import '../models/product.dart';
import '../services/category_service.dart';
import '../services/product_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_ui.dart';
import '../widgets/product_card.dart';

class SectionScreen extends StatefulWidget {
  final String sectionName;
  const SectionScreen({super.key, required this.sectionName});

  @override
  State<SectionScreen> createState() => _SectionScreenState();
}

class _SectionScreenState extends State<SectionScreen> {
  List<HomeCategory> _subcats = [];
  List<Product> _products = [];
  int? _selectedSubcatId; // null = All
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // "All products" pseudo-section: pull everything from ProductService.
      final isAll = widget.sectionName == 'All products';

      if (isAll) {
        final all = await ProductService.getProducts();
        if (!mounted) return;
        setState(() {
          _subcats = [];
          _products = all;
          _loading = false;
        });
        return;
      }

      final results = await Future.wait([
        CategoryService.getSectionCategories(widget.sectionName),
        CategoryService.getSectionProducts(widget.sectionName),
      ]);
      if (!mounted) return;
      setState(() {
        _subcats = results[0] as List<HomeCategory>;
        _products = results[1] as List<Product>;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = "We couldn't load this section right now.";
      });
    }
  }

  Future<void> _selectSubcat(int? id) async {
    setState(() => _selectedSubcatId = id);
    if (widget.sectionName == 'All products') return;
    setState(() => _loading = true);
    try {
      final list = await CategoryService.getSectionProducts(
        widget.sectionName,
        categoryId: id,
      );
      if (!mounted) return;
      setState(() {
        _products = list;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = "We couldn't load products right now.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.sectionName)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? AppErrorState(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
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
        if (_subcats.isNotEmpty)
          SliverToBoxAdapter(child: _subcatStrip(horizontal: true)),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.md),
          sliver: SliverToBoxAdapter(
            child: SectionHeading(title: _headingFor(null)),
          ),
        ),
        _productGrid(),
        const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxl)),
      ],
    );
  }

  Widget _wideLayout() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_subcats.isNotEmpty)
          SizedBox(width: 140, child: _subcatStrip(horizontal: false)),
        Expanded(
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.md),
                sliver: SliverToBoxAdapter(
                  child: SectionHeading(title: _headingFor(null)),
                ),
              ),
              _productGrid(),
            ],
          ),
        ),
      ],
    );
  }

  String _headingFor(int? id) {
    if (id == null && _selectedSubcatId == null) return 'All items';
    for (final s in _subcats) {
      if (s.id == _selectedSubcatId) return s.name;
    }
    return 'All items';
  }

  Widget _subcatStrip({required bool horizontal}) {
    final tiles = <Widget>[
      _subcatTile(null, 'All', '\u{1F6CD}\uFE0F', const Color(0xFFE8F5E9)),
      ..._subcats.map((s) => _subcatTile(s.id, s.name, s.icon, s.bgColor)),
    ];

    if (horizontal) {
      return SizedBox(
        height: 108,
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 0),
          scrollDirection: Axis.horizontal,
          itemCount: tiles.length,
          separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.md),
          itemBuilder: (_, i) => tiles[i],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: tiles,
    );
  }

  Widget _subcatTile(int? id, String name, String icon, Color bg) {
    final selected = id == _selectedSubcatId ||
        (id == null && _selectedSubcatId == null);
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: () => _selectSubcat(id),
      child: SizedBox(
        width: 82,
        child: Column(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: bg,
                shape: BoxShape.circle,
                border: selected
                    ? Border.all(color: AppColors.brandDark, width: 2)
                    : null,
              ),
              child: Center(
                child: Text(icon,
                    style: const TextStyle(fontSize: 28, height: 1.0),
                    textAlign: TextAlign.center),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                height: 1.15,
                color: selected ? AppColors.brandDark : null,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _productGrid() {
    if (_products.isEmpty) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: AppEmptyState(
          icon: Icons.inventory_2_outlined,
          title: 'No products yet',
          message: 'Products for this category are coming soon.',
        ),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      sliver: SliverLayoutBuilder(
        builder: (context, constraints) {
          final w = constraints.crossAxisExtent;
          final cols = w >= 1000
              ? 4
              : w >= 650
                  ? 3
                  : 2;
          return SliverGrid.builder(
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: cols,
              crossAxisSpacing: AppSpacing.md,
              mainAxisSpacing: AppSpacing.md,
              childAspectRatio: 0.68,
            ),
            itemCount: _products.length,
            itemBuilder: (_, i) => ProductCard(product: _products[i]),
          );
        },
      ),
    );
  }
}
