import 'dart:async';
import 'package:flutter/material.dart';
import '../services/driver_dispatch_api.dart';

class DriverOfferScreen extends StatefulWidget {
  final int driverId;
  const DriverOfferScreen({super.key, this.driverId = 1});
  @override
  State<DriverOfferScreen> createState() => _DriverOfferScreenState();
}

class _DriverOfferScreenState extends State<DriverOfferScreen> {
  late Future<List<Map<String, dynamic>>> _future;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _reload();
    _poll = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) _reload();
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  void _reload() {
    setState(() { _future = DriverDispatchApi.inbox(widget.driverId); });
  }

  Future<void> _accept(int orderId) async {
    try {
      await DriverDispatchApi.accept(widget.driverId, orderId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order accepted')));
      _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  Future<void> _reject(int orderId) async {
    try {
      await DriverDispatchApi.reject(widget.driverId, orderId, 'not available');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order rejected')));
      _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Delivery Offers'),
        actions: [IconButton(onPressed: _reload, icon: const Icon(Icons.refresh))],
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) {
            return Center(child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text('${snap.error}', textAlign: TextAlign.center),
            ));
          }
          final offers = snap.data ?? const [];
          if (offers.isEmpty) return const Center(child: Text('No offers right now. Polling every 5s.'));
          return ListView.separated(
            padding: const EdgeInsets.all(12),
            itemCount: offers.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, i) {
              final o = offers[i];
              final orderId = o['order_id'] as int;
              return Card(
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Order #$orderId', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text('Pickup: ${o['store_name'] ?? '?'}'),
                      Text('Address: ${o['store_address'] ?? '?'}'),
                      Text('Total: ₹${o['total_amount'] ?? '?'}'),
                      Text('Score: ${o['score'] ?? '?'}',
                          style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      const SizedBox(height: 12),
                      Row(children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _reject(orderId),
                            icon: const Icon(Icons.close),
                            label: const Text('Decline'),
                            style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: () => _accept(orderId),
                            icon: const Icon(Icons.check),
                            label: const Text('Accept'),
                          ),
                        ),
                      ]),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
