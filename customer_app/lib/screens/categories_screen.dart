import 'package:flutter/material.dart';
import '../models/section.dart';
import '../services/category_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_ui.dart';
import 'section_screen.dart';

/// Categories tab — shows the 20 top-level sections.
/// Subcategories never appear here; they live inside SectionScreen.
class CategoriesScreen extends StatefulWidget {
  final int? initialCategory;
  const CategoriesScreen({super.key, this.initialCategory});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  List<Section> _sections = [];
  bool _loading = true;
  String? _error;
  String _query = '';

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
      final list = await CategoryService.getSections();
      if (!mounted) return;
      setState(() {
        _sections = list;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = "We couldn't load categories right now.";
      });
    }
  }

  List<Section> get _shown {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return _sections;
    return _sections.where((s) => s.name.toLowerCase().contains(q)).toList();
  }

  int get _totalItems =>
      _sections.fold<int>(0, (n, s) => n + s.productCount);

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Scaffold(body: AppErrorState(message: _error!, onRetry: _load));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Browse categories')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _searchField()),
            SliverToBoxAdapter(child: _allProductsTile()),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.md),
              sliver: SliverToBoxAdapter(
                child: SectionHeading(title: 'Shop by section'),
              ),
            ),
            _sectionsGrid(),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxl)),
          ],
        ),
      ),
    );
  }

  Widget _searchField() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 0),
      child: TextField(
        onChanged: (v) => setState(() => _query = v),
        decoration: const InputDecoration(
          hintText: 'Search categories',
          prefixIcon: Icon(Icons.search_rounded),
        ),
      ),
    );
  }

  Widget _allProductsTile() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, 0),
      child: Material(
        color: AppColors.brandSoft,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const SectionScreen(sectionName: 'All products'),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Row(
              children: [
                const Icon(Icons.storefront_rounded,
                    color: AppColors.brandDark, size: 30),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('All products',
                          style: TextStyle(
                              fontWeight: FontWeight.w800, fontSize: 15)),
                      const SizedBox(height: 2),
                      Text('$_totalItems items across all sections',
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.inkMuted)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded,
                    color: AppColors.brandDark),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _sectionsGrid() {
    final list = _shown;
    if (list.isEmpty) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: AppEmptyState(
          icon: Icons.search_off_rounded,
          title: 'No categories found',
          message: 'Try another search term.',
        ),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      sliver: SliverLayoutBuilder(
        builder: (context, constraints) {
          final w = constraints.crossAxisExtent;
          final cols = w >= 1100
              ? 6
              : w >= 800
                  ? 5
                  : w >= 500
                      ? 4
                      : 3;
          return SliverGrid.builder(
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: cols,
              crossAxisSpacing: AppSpacing.md,
              mainAxisSpacing: AppSpacing.md,
              childAspectRatio: 0.78,
            ),
            itemCount: list.length,
            itemBuilder: (_, i) => _SectionTile(section: list[i]),
          );
        },
      ),
    );
  }
}

class _SectionTile extends StatelessWidget {
  final Section section;
  const _SectionTile({required this.section});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => SectionScreen(sectionName: section.name),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: section.bgColor,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    section.icon,
                    style: const TextStyle(
                      fontSize: 30,
                      height: 1.0,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Flexible(
                child: Text(
                  section.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '${section.productCount} items',
                style: const TextStyle(
                    fontSize: 10, color: AppColors.inkMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
