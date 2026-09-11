import 'package:flutter/material.dart';
import '../models/order.dart';
import '../services/order_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_ui.dart';
import 'order_details_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  static const _filters = ['All', 'Active', 'Delivered', 'Cancelled'];

  List<Order> _orders = [];
  bool _loading = true;
  String? _error;
  String _filter = 'All';

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final orders = await OrderService.getOrders();
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Unable to load your order history.';
      });
    }
  }

  List<Order> get _visibleOrders {
    if (_filter == 'All') return _orders;
    return _orders.where((order) {
      final status = order.status.toLowerCase();
      if (_filter == 'Active') {
        return !['delivered', 'cancelled'].contains(status);
      }
      if (_filter == 'Delivered') return status == 'delivered';
      return status == 'cancelled';
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your orders'),
        // Sticky filter chip row lives inside the AppBar's `bottom` slot so
        // it stays visible while the order list scrolls. Chips scroll
        // horizontally within their own row — never wrap.
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: _FilterRow(
            filters: _filters,
            selected: _filter,
            onSelected: (label) => setState(() => _filter = label),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadOrders,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return AppErrorState(message: _error!, onRetry: _loadOrders);
    }
    if (_orders.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.55,
            child: const AppEmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No orders yet',
              message: 'Your completed grocery orders will appear here.',
            ),
          ),
        ],
      );
    }
    if (_visibleOrders.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.55,
            child: const AppEmptyState(
              icon: Icons.filter_alt_off_outlined,
              title: 'Nothing in this filter',
              message: 'Try another order status.',
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.xxl),
      itemCount: _visibleOrders.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (_, index) => _orderCard(_visibleOrders[index]),
    );
  }

  Widget _orderCard(Order order) {
    final status = order.status.toLowerCase();
    return Card(
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => OrderDetailsScreen(orderId: order.id),
          ),
        ),
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                      child: Text('#PVL${order.id}',
                          style: const TextStyle(
                              fontWeight: FontWeight.w800, fontSize: 16))),
                  _statusChip(status),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                  '${order.items.length} item${order.items.length == 1 ? '' : 's'}  •  ₹${order.totalAmount.toStringAsFixed(0)}',
                  style: const TextStyle(color: AppColors.inkMuted)),
              const SizedBox(height: AppSpacing.lg),
              _timeline(status),
              if (!['delivered', 'cancelled'].contains(status)) ...[
                const SizedBox(height: AppSpacing.lg),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) =>
                            OrderDetailsScreen(orderId: order.id),
                      ),
                    ),
                    icon: const Icon(Icons.location_on_outlined),
                    label: const Text('Track order'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusChip(String status) {
    final label = status.replaceAll('_', ' ').toUpperCase();
    final cancelled = status == 'cancelled';
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
      decoration: BoxDecoration(
          color: cancelled
              ? AppColors.surfaceSecondary
              : AppColors.brandSoft,
          borderRadius: BorderRadius.circular(AppRadius.pill)),
      child: Text(label,
          style: TextStyle(
              color: cancelled ? AppColors.inkMuted : AppColors.brandDark,
              fontSize: 10,
              fontWeight: FontWeight.w800)),
    );
  }

  Widget _timeline(String status) {
    const steps = [
      'Order placed',
      'Store accepted',
      'Preparing',
      'Out for delivery',
      'Delivered'
    ];
    final current = _statusIndex(status);
    return Column(
      children: List.generate(steps.length, (index) {
        final completed = index <= current;
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
          child: Row(
            children: [
              Icon(
                  completed
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_unchecked,
                  size: 19,
                  color: completed
                      ? AppColors.brandPrimary
                      : AppColors.borderStrong),
              const SizedBox(width: AppSpacing.sm),
              Text(steps[index],
                  style: TextStyle(
                      fontSize: 12,
                      color:
                          completed ? AppColors.ink : AppColors.inkMuted,
                      fontWeight:
                          completed ? FontWeight.w700 : FontWeight.w500)),
            ],
          ),
        );
      }),
    );
  }

  int _statusIndex(String status) {
    switch (status) {
      case 'accepted':
        return 1;
      case 'preparing':
      case 'ready':
        return 2;
      case 'assigned':
      case 'picked_up':
      case 'out_for_delivery':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 0;
    }
  }
}

/// Sticky horizontal filter chip row.
///
/// Follows the shared "filter chip row" pattern:
/// - fixed 56pt row height
/// - one horizontal scroller (chips never wrap)
/// - each chip has `flexShrink: 0` equivalent (fixed intrinsic width)
/// - selected chip changes color/border only, not size or weight
class _FilterRow extends StatelessWidget {
  final List<String> filters;
  final String selected;
  final ValueChanged<String> onSelected;

  const _FilterRow({
    required this.filters,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      color: AppColors.surface,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
        itemBuilder: (_, index) {
          final label = filters[index];
          final active = label == selected;
          return Center(
            child: ChoiceChip(
              label: Text(label),
              selected: active,
              onSelected: (_) => onSelected(label),
              selectedColor: AppColors.brandPrimary,
              labelStyle: TextStyle(
                color: active ? Colors.white : AppColors.ink,
                fontWeight: FontWeight.w700,
              ),
              side: BorderSide(
                  color: active
                      ? AppColors.brandPrimary
                      : AppColors.border),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
            ),
          );
        },
      ),
    );
  }
}
