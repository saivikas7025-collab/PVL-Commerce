import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/order.dart';
import '../models/product.dart';
import '../models/section.dart';
import '../providers/address_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/cart_provider.dart';
import '../services/category_service.dart';
import '../services/order_service.dart';
import '../services/product_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_ui.dart';
import '../widgets/product_card.dart';
import 'address_screens.dart';
import 'auth_flow.dart';
import 'cart_screen.dart';
import 'categories_screen.dart';
import 'login_screen.dart';
import 'order_details_screen.dart';
import 'orders_screen.dart';
import 'section_screen.dart';
import 'splash_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const _tabHome = 0;
  static const _tabCategories = 1;
  static const _tabCart = 2;
  static const _tabOrders = 3;
  static const _tabProfile = 4;

  int _tab = _tabHome;
  int? _pendingTab;

  List<Product> _products = [];
  List<Section> _sections = [];
  bool _loading = true;
  String? _error;
  String _query = '';
  final _searchController = TextEditingController();
  Order? _activeOrder;

  @override
  void initState() {
    super.initState();
    _loadData();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<CartProvider>().hydrate();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await Future.wait([
        ProductService.getProducts(),
        CategoryService.getSections(),
      ]);
      if (!mounted) return;
      setState(() {
        _products = result[0] as List<Product>;
        _sections = result[1] as List<Section>;
        _loading = false;
      });
      await _loadActiveOrder();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Unable to load the catalog. Please try again.';
      });
    }
  }

  Future<void> _loadActiveOrder() async {
    try {
      final orders = await OrderService.getOrders();
      Order? active;
      for (final o in orders) {
        if (!['delivered', 'cancelled'].contains(o.status.toLowerCase())) {
          active = o;
          break;
        }
      }
      if (mounted) setState(() => _activeOrder = active);
    } catch (_) {}
  }

  List<Product> get _filteredProducts {
    final query = _query.trim().toLowerCase();
    if (query.isEmpty) return _products;
    return _products.where((product) {
      return product.name.toLowerCase().contains(query) ||
          product.categoryName.toLowerCase().contains(query) ||
          product.mainCategory.toLowerCase().contains(query) ||
          product.subcategory.toLowerCase().contains(query);
    }).toList();
  }

  bool _requiresAuth(int tab) =>
      tab == _tabCart || tab == _tabOrders || tab == _tabProfile;

  Future<void> _selectTab(int tab) async {
    final auth = context.read<AuthProvider>();
    if (_requiresAuth(tab) && !auth.isLoggedIn) {
      _pendingTab = tab;
      await pushAuthScreen<void>(context, const LoginScreen());
      if (!mounted) return;
      final loggedInNow = context.read<AuthProvider>().isLoggedIn;
      if (loggedInNow && _pendingTab != null) {
        setState(() => _tab = _pendingTab!);
        _pendingTab = null;
      } else {
        _pendingTab = null;
      }
      return;
    }
    setState(() => _tab = tab);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.isLoggedIn && _requiresAuth(_tab)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _tab = _tabHome);
      });
    }

    return Scaffold(
      body: IndexedStack(
        index: _tab,
        children: [
          _homeTab(),
          const CategoriesScreen(),
          if (auth.isLoggedIn) const CartScreen() else const SizedBox.shrink(),
          if (auth.isLoggedIn)
            const OrdersScreen()
          else
            const SizedBox.shrink(),
          if (auth.isLoggedIn)
            _ProfileTab(onOpenOrders: () => _selectTab(_tabOrders))
          else
            const SizedBox.shrink(),
        ],
      ),
      bottomNavigationBar: _bottomNavigationBar(),
    );
  }

  Widget _homeTab() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return AppErrorState(message: _error!, onRetry: _loadData);
    }

    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        onRefresh: _loadData,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _header()),
            SliverToBoxAdapter(child: _search()),
            SliverToBoxAdapter(child: _activeOrderCard()),
            SliverToBoxAdapter(child: _deliveryBanner()),
            SliverToBoxAdapter(child: _categorySection()),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg, AppSpacing.xl, AppSpacing.lg, AppSpacing.md),
                child: SectionHeading(
                  title: _query.isEmpty ? 'Popular near you' : 'Search results',
                  actionLabel:
                      _query.isEmpty && _products.length > 6 ? 'See all' : null,
                  onAction: () => _selectTab(_tabCategories),
                ),
              ),
            ),
            _productGrid(),
            if (_query.isEmpty && _products.length > 6)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpacing.lg,
                      AppSpacing.xxl, AppSpacing.lg, AppSpacing.huge),
                  child: _valueCard(),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.huge)),
          ],
        ),
      ),
    );
  }

  Widget _activeOrderCard() {
    if (_activeOrder == null) return const SizedBox.shrink();
    final order = _activeOrder!;
    final status = order.status.toUpperCase().replaceAll('_', ' ');
    return Container(
      margin: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg, vertical: AppSpacing.md),
      child: Card(
        color: AppColors.brandSoft,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              const Icon(Icons.local_shipping_rounded,
                  color: AppColors.brandDark),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Order #PVL${order.id}',
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text('Status: $status',
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.inkMuted)),
                  ],
                ),
              ),
              if (order.status.toLowerCase() != 'delivered')
                OutlinedButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) =>
                            OrderDetailsScreen(orderId: order.id)),
                  ),
                  child: const Text('Track'),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.md),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: AppColors.brandSoft,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: const Icon(Icons.shopping_basket_rounded,
                color: AppColors.brandDark),
          ),
          const SizedBox(width: AppSpacing.md),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Deliver to',
                    style:
                        TextStyle(fontSize: 11, color: AppColors.inkMuted)),
                SizedBox(height: 2),
                Text('Select your location',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Open profile',
            onPressed: () => _selectTab(_tabProfile),
            icon: const Icon(Icons.person_outline_rounded),
          ),
        ],
      ),
    );
  }

  Widget _search() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: TextField(
        controller: _searchController,
        onChanged: (value) => setState(() => _query = value),
        decoration: InputDecoration(
          hintText: 'Search groceries, fruits, vegetables...',
          prefixIcon: const Icon(Icons.search_rounded),
          suffixIcon: _query.isEmpty
              ? const Icon(Icons.tune_rounded, color: AppColors.inkMuted)
              : IconButton(
                  tooltip: 'Clear search',
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _query = '');
                  },
                  icon: const Icon(Icons.close_rounded),
                ),
        ),
      ),
    );
  }

  Widget _deliveryBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.xl, AppSpacing.lg, 0),
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.brandDark,
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: const Row(
        children: [
          Icon(Icons.bolt_rounded, color: Colors.white, size: 30),
          SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Fresh essentials, fast',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w800)),
                SizedBox(height: AppSpacing.xs),
                Text('Shop your daily needs in a few taps.',
                    style: TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ),
          Icon(Icons.arrow_forward_rounded, color: Colors.white),
        ],
      ),
    );
  }

  Widget _categorySection() {
    if (_sections.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.xl,
            AppSpacing.lg,
            AppSpacing.md,
          ),
          child: SectionHeading(
            title: 'Shop by category',
            actionLabel: 'View all',
            onAction: () => _selectTab(_tabCategories),
          ),
        ),
        SizedBox(
          height: 112,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            scrollDirection: Axis.horizontal,
            itemCount: _sections.length,
            separatorBuilder: (_, __) =>
                const SizedBox(width: AppSpacing.md),
            itemBuilder: (_, index) {
              final section = _sections[index];
              return _sectionTile(section);
            },
          ),
        ),
      ],
    );
  }

  Widget _sectionTile(Section section) {
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => SectionScreen(
              sectionName: section.name,
            ),
          ),
        );
      },
      child: SizedBox(
        width: 88,
        child: Column(
          children: [
            Container(
              width: 68,
              height: 68,
              decoration: BoxDecoration(
                color: section.bgColor,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Center(
                child: Text(
                  section.icon,
                  style: const TextStyle(
                    fontSize: 30,
                    height: 1,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              section.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                height: 1.15,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _productGrid() {
    if (_filteredProducts.isEmpty) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: AppEmptyState(
          icon: Icons.search_off_rounded,
          title: 'No products found nearby',
          message: 'Try searching for another grocery or refresh the feed.',
        ),
      );
    }
    final products = _query.isEmpty && _filteredProducts.length > 6
        ? _filteredProducts.take(6).toList()
        : _filteredProducts;
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      sliver: SliverLayoutBuilder(
        builder: (context, constraints) {
          final count = constraints.crossAxisExtent >= 1000
              ? 4
              : constraints.crossAxisExtent >= 640
                  ? 3
                  : 2;
          return SliverGrid.builder(
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: count,
              crossAxisSpacing: AppSpacing.md,
              mainAxisSpacing: AppSpacing.md,
              childAspectRatio: 0.68,
            ),
            itemCount: products.length,
            itemBuilder: (_, index) => ProductCard(product: products[index]),
          );
        },
      ),
    );
  }

  Widget _valueCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Row(
          children: [
            const Icon(Icons.verified_outlined,
                color: AppColors.brandDark, size: 30),
            const SizedBox(width: AppSpacing.md),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Quality you can count on',
                      style: TextStyle(fontWeight: FontWeight.w800)),
                  SizedBox(height: AppSpacing.xs),
                  Text('Carefully selected essentials for every home.',
                      style: TextStyle(
                          fontSize: 12, color: AppColors.inkMuted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bottomNavigationBar() {
    return Consumer<CartProvider>(
      builder: (context, cart, _) {
        return NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: _selectTab,
          destinations: [
            const NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home_rounded),
                label: 'Home'),
            const NavigationDestination(
                icon: Icon(Icons.grid_view_outlined),
                selectedIcon: Icon(Icons.grid_view_rounded),
                label: 'Categories'),
            NavigationDestination(
              icon: _badgeIcon(Icons.shopping_bag_outlined, cart.itemCount),
              selectedIcon:
                  _badgeIcon(Icons.shopping_bag_rounded, cart.itemCount),
              label: 'Cart',
            ),
            const NavigationDestination(
                icon: Icon(Icons.receipt_long_outlined),
                selectedIcon: Icon(Icons.receipt_long_rounded),
                label: 'Orders'),
            const NavigationDestination(
                icon: Icon(Icons.person_outline_rounded),
                selectedIcon: Icon(Icons.person_rounded),
                label: 'Profile'),
          ],
        );
      },
    );
  }

  Widget _badgeIcon(IconData icon, int count) {
    return Badge(
      isLabelVisible: count > 0,
      label: Text(count > 99 ? '99+' : '$count'),
      child: Icon(icon),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  final VoidCallback onOpenOrders;

  const _ProfileTab({required this.onOpenOrders});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          const SizedBox(height: AppSpacing.lg),
          Text('Your profile',
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: AppSpacing.xs),
          const Text('Manage your account and preferences',
              style: TextStyle(color: AppColors.inkMuted)),
          const SizedBox(height: AppSpacing.xl),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Row(
                children: [
                  const CircleAvatar(
                    radius: 28,
                    backgroundColor: AppColors.brandSoft,
                    child: Icon(Icons.person_rounded,
                        color: AppColors.brandDark, size: 30),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('PVL Mart customer',
                            style: TextStyle(
                                fontWeight: FontWeight.w800, fontSize: 16)),
                        SizedBox(height: AppSpacing.xs),
                        Text('Your grocery account',
                            style: TextStyle(
                                color: AppColors.inkMuted, fontSize: 12)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded,
                      color: AppColors.inkMuted),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          _profileSection('Shopping', [
            _ProfileRow(
                icon: Icons.location_on_outlined,
                title: 'Saved addresses',
                onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                          builder: (_) => const AddressBookScreen()),
                    )),
            _ProfileRow(
                icon: Icons.receipt_long_outlined,
                title: 'My orders',
                onTap: onOpenOrders),
            _ProfileRow(
                icon: Icons.payment_outlined,
                title: 'Payment methods',
                onTap: () => _notConnected(context,
                    'Payment methods are managed by the server checkout flow.')),
          ]),
          const SizedBox(height: AppSpacing.lg),
          _profileSection('Support', [
            _ProfileRow(
                icon: Icons.help_outline_rounded,
                title: 'Help & support',
                onTap: () => _notConnected(context,
                    'Support contact details are not configured yet.')),
            _ProfileRow(
                icon: Icons.privacy_tip_outlined,
                title: 'Privacy policy',
                onTap: () => _notConnected(context,
                    'Privacy policy content is not configured yet.')),
          ]),
          const SizedBox(height: AppSpacing.lg),
          OutlinedButton.icon(
            onPressed: () async {
              final auth = context.read<AuthProvider>();
              final cart = context.read<CartProvider>();
              final addresses = context.read<AddressProvider>();
              final navigator = Navigator.of(context);
              await auth.logout();
              cart.reset();
              addresses.reset();
              navigator.pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const SplashScreen()),
                (_) => false,
              );
            },
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Log out'),
          ),
        ],
      ),
    );
  }

  Widget _profileSection(String title, List<Widget> rows) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: AppColors.inkMuted)),
        const SizedBox(height: AppSpacing.sm),
        Card(child: Column(children: rows)),
      ],
    );
  }

  void _notConnected(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }
}

class _ProfileRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _ProfileRow(
      {required this.icon, required this.title, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      minVerticalPadding: AppSpacing.sm,
      leading: Icon(icon, color: AppColors.brandDark),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      trailing:
          const Icon(Icons.chevron_right_rounded, color: AppColors.inkMuted),
      onTap: onTap,
    );
  }
}