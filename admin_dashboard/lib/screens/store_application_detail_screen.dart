import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/admin_api.dart';

class StoreApplicationDetailScreen extends StatefulWidget {
  final int storeId;
  const StoreApplicationDetailScreen({super.key, required this.storeId});
  @override
  State<StoreApplicationDetailScreen> createState() => _StoreApplicationDetailScreenState();
}

class _StoreApplicationDetailScreenState extends State<StoreApplicationDetailScreen> {
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = AdminApi.getApplication(widget.storeId);
  }

  void _reload() {
    setState(() => _future = AdminApi.getApplication(widget.storeId));
  }

  Future<void> _run(String label, Future<void> Function() action) async {
    try {
      await action();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$label done')));
      _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$label failed: $e')));
    }
  }

  Future<String?> _prompt(String title, String hint, {bool required = true}) {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: ctrl,
          maxLines: 3,
          decoration: InputDecoration(hintText: hint),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              final t = ctrl.text.trim();
              if (required && t.isEmpty) return;
              Navigator.pop(ctx, t);
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
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

  String _v(dynamic x) {
    if (x == null) return '—';
    final s = x.toString().trim();
    return s.isEmpty ? '—' : s;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Store #${widget.storeId}'),
        actions: [IconButton(onPressed: _reload, icon: const Icon(Icons.refresh))],
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text('${snap.error}'),
              ),
            );
          }
          final data = snap.data ?? <String, dynamic>{};
          final store = (data['store'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
          final docs = (data['documents'] as List?) ?? const [];
          final history = (data['history'] as List?) ?? const [];
          final status = (store['approval_status'] ?? 'pending').toString();

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _header(store, status),
              const SizedBox(height: 12),
              _reviewChecklist(store),
              const SizedBox(height: 12),
              _section('Owner & Contact (for KYC)', [
                _kv('Owner name', store['owner_name']),
                _kv('Business type', store['business_type']),
                _kv('Primary phone', store['phone']),
                _kv('Alt phone', store['alt_phone']),
                _kv('Email', store['email']),
              ]),
              const SizedBox(height: 12),
              _section('Business Identity', [
                _kv('Legal name', store['legal_name']),
                _kv('Display name', store['name']),
                _kv('Categories', (store['categories'] as List?)?.join(', ')),
                _kv('PAN', store['pan']),
                _kv('GSTIN', store['gstin']),
                _kv('FSSAI licence', store['fssai_license']),
              ]),
              const SizedBox(height: 12),
              _section('Bank & Settlement', [
                _kv('Holder', store['bank_holder_name']),
                _kv('Bank', store['bank_name']),
                _kv('Account no.', store['bank_account_no']),
                _kv('IFSC', store['bank_ifsc']),
                _kv('UPI', store['upi_id']),
              ]),
              const SizedBox(height: 12),
              _section('Location & Operations', [
                _kv('Address', store['address']),
                _kv('City', store['city']),
                _kv('State', store['state']),
                _kv('Pincode', store['pincode']),
                _kv('Latitude', store['latitude']),
                _kv('Longitude', store['longitude']),
                _kv('Opening', store['opening_time']),
                _kv('Closing', store['closing_time']),
                _kv('Prep time (min)', store['prep_time_minutes']),
                _kv('Delivery radius (km)', store['delivery_radius_km']),
              ]),
              const SizedBox(height: 12),
              _documentsSection(docs),
              const SizedBox(height: 12),
              _historySection(history),
              const SizedBox(height: 80),
            ],
          );
        },
      ),
      bottomNavigationBar: _actionBar(),
    );
  }

  Widget _header(Map<String, dynamic> store, String status) {
    final color = _statusColor(status);
    return Card(
      elevation: 0,
      color: color.withOpacity(0.06),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 26,
              backgroundColor: color.withOpacity(0.15),
              child: Icon(Icons.storefront, color: color),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _v(store['name']),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Status: ${status.replaceAll('_', ' ')}',
                    style: TextStyle(color: color, fontWeight: FontWeight.w500),
                  ),
                  if (store['approved_at'] != null)
                    Text(
                      'Approved at ${store['approved_at']} by ${_v(store['approved_by'])}',
                      style: const TextStyle(fontSize: 11, color: Colors.black54),
                    ),
                  if (store['rejection_reason'] != null &&
                      _v(store['rejection_reason']) != '—')
                    Text(
                      'Note: ${store['rejection_reason']}',
                      style: const TextStyle(fontSize: 11, color: Colors.redAccent),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _reviewChecklist(Map<String, dynamic> store) {
    bool on(dynamic v) => v == true;

    final items = <MapEntry<String, bool>>[
      MapEntry('Phone verified', on(store['phone_verified'])),
      MapEntry('Email verified', on(store['email_verified'])),
      MapEntry('KYC verified', on(store['kyc_verified'])),
      MapEntry('Bank verified', on(store['bank_verified'])),
      MapEntry('Address verified', on(store['address_verified'])),
      MapEntry('Licence verified', on(store['licence_verified'])),
      MapEntry('Location verified', on(store['location_verified'])),
    ];
    final done = items.where((e) => e.value).length;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.fact_check_outlined, size: 18),
                const SizedBox(width: 8),
                const Text('Review Checklist',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                const Spacer(),
                Text('$done / ${items.length}',
                    style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final e in items)
                  Chip(
                    avatar: Icon(
                      e.value ? Icons.check_circle : Icons.radio_button_unchecked,
                      size: 16,
                      color: e.value ? Colors.green : Colors.grey,
                    ),
                    label: Text(e.key),
                    backgroundColor: e.value ? Colors.green.withOpacity(0.10) : null,
                    side: BorderSide(
                      color: e.value ? Colors.green.withOpacity(0.4) : Colors.grey.shade300,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _documentsSection(List docs) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.attach_file, size: 18),
                const SizedBox(width: 8),
                const Text('Documents',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                const Spacer(),
                Text('${docs.length}', style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 8),
            if (docs.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text('No documents uploaded.', style: TextStyle(color: Colors.grey)),
              )
            else
              for (final d in docs)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.description_outlined),
                  title: Text((d['doc_type'] ?? '').toString()),
                  subtitle: Text(
                    (d['doc_url'] ?? '').toString(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.open_in_new),
                    onPressed: () async {
                      final url = (d['doc_url'] ?? '').toString();
                      if (url.isEmpty) return;
                      final uri = Uri.tryParse(url);
                      if (uri == null) return;
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    },
                  ),
                ),
          ],
        ),
      ),
    );
  }

  Widget _historySection(List history) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.timeline, size: 18),
                const SizedBox(width: 8),
                const Text('Approval History',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              ],
            ),
            const SizedBox(height: 8),
            if (history.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text('No history yet.', style: TextStyle(color: Colors.grey)),
              )
            else
              for (final h in history)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.circle, size: 10),
                  title: Text(
                    '${h['action']} · ${_v(h['from_status'])} → ${_v(h['to_status'])}',
                  ),
                  subtitle: Text('${_v(h['actor'])} · ${_v(h['note'])}'),
                ),
          ],
        ),
      ),
    );
  }

  Widget _section(String title, List<Widget> children) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 8),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _kv(String k, dynamic v) {
    final text = _v(v);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(k, style: const TextStyle(color: Colors.black54, fontSize: 13)),
          ),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }

  Widget _actionBar() {
    return FutureBuilder<Map<String, dynamic>>(
      future: _future,
      builder: (context, snap) {
        final data = snap.data ?? <String, dynamic>{};
        final store = (data['store'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
        final status = (store['approval_status'] ?? 'pending').toString();
        final done = status == 'approved' || status == 'rejected';

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: done
                        ? null
                        : () async {
                            final note = await _prompt('Request more info', 'What do you need?');
                            if (note == null || note.isEmpty) return;
                            await _run('Request info',
                                () => AdminApi.requestInfo(widget.storeId, note: note));
                          },
                    icon: const Icon(Icons.info_outline),
                    label: const Text('Info'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: done
                        ? null
                        : () async {
                            final reason = await _prompt('Reject application', 'Reason');
                            if (reason == null || reason.isEmpty) return;
                            await _run('Reject',
                                () => AdminApi.reject(widget.storeId, reason: reason));
                          },
                    icon: const Icon(Icons.close),
                    label: const Text('Reject'),
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: (status == 'approved')
                        ? null
                        : () async {
                            final note = await _prompt('Approve', 'Optional note',
                                required: false);
                            await _run(
                              'Approve',
                              () => AdminApi.approve(
                                widget.storeId,
                                note: (note == null || note.isEmpty) ? null : note,
                              ),
                            );
                          },
                    icon: const Icon(Icons.check),
                    label: const Text('Approve'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}