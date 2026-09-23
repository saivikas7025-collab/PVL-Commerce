import 'package:flutter/material.dart';
import '../services/admin_api.dart';
import 'store_application_detail_screen.dart';

class StoreApplicationsScreen extends StatefulWidget {
  const StoreApplicationsScreen({super.key});
  @override
  State<StoreApplicationsScreen> createState() => _StoreApplicationsScreenState();
}

class _StoreApplicationsScreenState extends State<StoreApplicationsScreen>
    with SingleTickerProviderStateMixin {
  static const _statuses = ['pending', 'more_info_required', 'approved', 'rejected', 'all'];
  static const _labels = ['Pending', 'Info Req.', 'Approved', 'Rejected', 'All'];

  late TabController _tabs;
  int _currentIndex = 0;
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: _statuses.length, vsync: this);
    _tabs.addListener(() {
      if (_tabs.indexIsChanging) return;
      setState(() {
        _currentIndex = _tabs.index;
        _future = AdminApi.listApplications(status: _statuses[_currentIndex]);
      });
    });
    _future = AdminApi.listApplications(status: _statuses[0]);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  void _reload() {
    setState(() {
      _future = AdminApi.listApplications(status: _statuses[_currentIndex]);
    });
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'approved':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      case 'more_info_required':
        return Colors.orange;
      default:
        return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Store Applications'),
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabs: [for (final l in _labels) Tab(text: l)],
        ),
        actions: [
          IconButton(onPressed: _reload, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return _errorView(snap.error.toString());
          }
          final rows = snap.data ?? const [];
          if (rows.isEmpty) {
            return const Center(child: Text('No applications in this view.'));
          }
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.separated(
              itemCount: rows.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final s = rows[i];
                final status = (s['approval_status'] ?? 'pending').toString();
                final color = _statusColor(status);
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: color.withOpacity(0.15),
                    child: Icon(Icons.storefront, color: color),
                  ),
                  title: Text(s['name']?.toString() ?? 'Unnamed store'),
                  subtitle: Text(
                    '${s['email'] ?? ''}\n${s['phone'] ?? ''}  ·  ${s['city'] ?? ''}',
                    maxLines: 2,
                  ),
                  isThreeLine: true,
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      status.replaceAll('_', ' '),
                      style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ),
                  onTap: () async {
                    final id = s['id'];
                    if (id is! int) return;
                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => StoreApplicationDetailScreen(storeId: id),
                      ),
                    );
                    _reload();
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _errorView(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 48),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: _reload, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}