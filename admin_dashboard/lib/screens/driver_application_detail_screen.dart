import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/admin_api.dart';

class DriverApplicationDetailScreen extends StatefulWidget {
  final int driverId;
  const DriverApplicationDetailScreen({super.key, required this.driverId});
  @override
  State<DriverApplicationDetailScreen> createState() => _DriverApplicationDetailScreenState();
}

class _DriverApplicationDetailScreenState extends State<DriverApplicationDetailScreen> {
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = AdminApi.getDriverApplication(widget.driverId);
  }

  void _reload() {
    setState(() => _future = AdminApi.getDriverApplication(widget.driverId));
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
          controller: ctrl, maxLines: 3,
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
      case 'approved':      return Colors.green;
      case 'rejected':      return Colors.red;
      case 'under_review':  return Colors.orange;
      case 'suspended':     return Colors.red;
      default:              return Colors.blueGrey;
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
        title: Text('Driver #${widget.driverId}'),
        actions: [IconButton(onPressed: _reload, icon: const Icon(Icons.refresh))],
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text('${snap.error}'),
            ));
          }
          final data = snap.data ?? <String, dynamic>{};
          final driver = (data['driver'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
          final docs = (data['documents'] as List?) ?? const [];
          final v = (data['verification'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
          final checks = (data['identity_checks'] as List?) ?? const [];
          final risks = (data['risk_events'] as List?) ?? const [];
          final history = (data['history'] as List?) ?? const [];

          final status = (driver['verification_status'] ?? 'pending').toString();
          final risk = (driver['risk_state'] ?? 'NORMAL').toString();

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _header(driver, status, risk),
              const SizedBox(height: 12),
              _checklist(v),
              const SizedBox(height: 12),
              _section('Owner', [
                _kv('Legal name', driver['full_legal_name']),
                _kv('DOB', driver['dob']),
                _kv('Email', driver['email']),
                _kv('Address', driver['address']),
                _kv('Emergency contact', driver['emergency_contact_name']),
                _kv('Emergency phone', driver['emergency_contact_phone']),
              ]),
              const SizedBox(height: 12),
              _section('Vehicle', [
                _kv('Type', driver['vehicle_type']),
                _kv('Number', driver['vehicle_number']),
              ]),
              const SizedBox(height: 12),
              _section('Bank', [
                _kv('Holder', driver['bank_holder_name']),
                _kv('Account', driver['bank_account_no']),
                _kv('IFSC', driver['bank_ifsc']),
                _kv('UPI', driver['upi_id']),
              ]),
              const SizedBox(height: 12),
              _documentsSection(docs),
              if (checks.isNotEmpty) ...[
                const SizedBox(height: 12),
                _section('Identity checks', [
                  for (final c in checks)
                    ListTile(
                      dense: true,
                      leading: Icon(
                        c['result'] == 'PASS' ? Icons.check_circle : Icons.cancel,
                        color: c['result'] == 'PASS' ? Colors.green : Colors.red,
                      ),
                      title: Text('${c['check_type']} · ${c['result']}'),
                      subtitle: Text('${c['created_at']}'),
                    ),
                ]),
              ],
              if (risks.isNotEmpty) ...[
                const SizedBox(height: 12),
                _section('Risk events', [
                  for (final r in risks)
                    ListTile(
                      dense: true,
                      leading: const Icon(Icons.warning_amber, color: Colors.orange),
                      title: Text('${r['event_type']} (${r['severity']})'),
                      subtitle: Text('${r['created_at']}'),
                    ),
                ]),
              ],
              if (history.isNotEmpty) ...[
                const SizedBox(height: 12),
                _section('Audit history', [
                  for (final h in history)
                    ListTile(
                      dense: true,
                      leading: const Icon(Icons.timeline),
                      title: Text('${h['action']} · ${_v(h['from_state'])} → ${_v(h['to_state'])}'),
                      subtitle: Text('${_v(h['actor_id'])} · ${_v(h['note'])}'),
                    ),
                ]),
              ],
              const SizedBox(height: 80),
            ],
          );
        },
      ),
      bottomNavigationBar: _actionBar(),
    );
  }

  Widget _header(Map<String, dynamic> driver, String status, String risk) {
    final color = _statusColor(status);
    return Card(
      elevation: 0,
      color: color.withValues(alpha: 0.06),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: color.withValues(alpha: 0.15),
            child: Icon(Icons.delivery_dining, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _v(driver['full_legal_name']).replaceAll('—', 'Driver #${driver['id']}'),
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              Text(
                'Status: ${status.replaceAll('_', ' ')}  ·  Risk: $risk',
                style: TextStyle(color: color, fontWeight: FontWeight.w500),
              ),
              if (driver['approved_at'] != null)
                Text(
                  'Approved ${_v(driver['approved_at'])} by ${_v(driver['approved_by'])}',
                  style: const TextStyle(fontSize: 11, color: Colors.black54),
                ),
              if (driver['rejection_reason'] != null && _v(driver['rejection_reason']) != '—')
                Text(
                  'Note: ${driver['rejection_reason']}',
                  style: const TextStyle(fontSize: 11, color: Colors.redAccent),
                ),
            ],
          )),
        ]),
      ),
    );
  }

  Widget _checklist(Map<String, dynamic> v) {
    bool ok(String k) => (v[k] ?? '') == 'approved';
    final items = <MapEntry<String, bool>>[
      MapEntry('Identity',  ok('identity_status')),
      MapEntry('DL',        ok('dl_status')),
      MapEntry('RC',        ok('rc_status')),
      MapEntry('Insurance', ok('insurance_status')),
      MapEntry('Address',   ok('address_status')),
      MapEntry('Selfie',    ok('selfie_status')),
      MapEntry('Bank',      ok('bank_status')),
    ];
    final done = items.where((e) => e.value).length;
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.fact_check_outlined, size: 18),
            const SizedBox(width: 8),
            const Text('Checklist', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const Spacer(),
            Text('$done / ${items.length}', style: const TextStyle(fontWeight: FontWeight.w600)),
          ]),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final e in items)
              Chip(
                avatar: Icon(
                  e.value ? Icons.check_circle : Icons.radio_button_unchecked,
                  size: 16,
                  color: e.value ? Colors.green : Colors.grey,
                ),
                label: Text(e.key),
                backgroundColor: e.value ? Colors.green.withValues(alpha: 0.10) : null,
                side: BorderSide(
                  color: e.value ? Colors.green.withValues(alpha: 0.4) : Colors.grey.shade300,
                ),
              ),
          ]),
        ]),
      ),
    );
  }

  Widget _documentsSection(List docs) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.attach_file, size: 18),
            const SizedBox(width: 8),
            const Text('Documents', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const Spacer(),
            Text('${docs.length}', style: const TextStyle(fontWeight: FontWeight.w600)),
          ]),
          const SizedBox(height: 8),
          if (docs.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Text('No documents uploaded yet.', style: TextStyle(color: Colors.grey)),
            )
          else
            for (final d in docs) _docTile(d),
        ]),
      ),
    );
  }

  Widget _docTile(Map<dynamic, dynamic> d) {
    final status = (d['status'] ?? 'pending').toString();
    Color c;
    switch (status) {
      case 'approved': c = Colors.green; break;
      case 'rejected': c = Colors.red; break;
      default:         c = Colors.orange;
    }
    final docId = d['id'] as int?;
    final fileId = d['front_url']?.toString() ?? '';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.description_outlined, color: c, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${d['doc_type']}', style: const TextStyle(fontWeight: FontWeight.w600)),
            if (d['doc_number'] != null && (d['doc_number'] as String).isNotEmpty)
              Text('No: ${d['doc_number']}', style: const TextStyle(fontSize: 12, color: Colors.black54)),
            if (d['expiry_date'] != null)
              Text('Expires: ${d['expiry_date']}', style: const TextStyle(fontSize: 12, color: Colors.black54)),
            Text(status.replaceAll('_', ' '), style: TextStyle(fontSize: 11, color: c, fontWeight: FontWeight.w600)),
          ])),
          IconButton(
            icon: const Icon(Icons.open_in_new),
            tooltip: 'Open',
            onPressed: fileId.isEmpty ? null : () async {
              final url = AdminApi.driveStreamUrl(fileId);
              final uri = Uri.tryParse(url);
              if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
            },
          ),
        ]),
        if (docId != null) Padding(
          padding: const EdgeInsets.only(left: 28, top: 4),
          child: Row(children: [
            TextButton.icon(
              onPressed: () => _run('Doc approve', () => AdminApi.approveDriverDoc(docId)),
              icon: const Icon(Icons.check, size: 16),
              label: const Text('Approve doc'),
            ),
            TextButton.icon(
              onPressed: () async {
                final r = await _prompt('Reject document', 'Reason');
                if (r == null || r.isEmpty) return;
                await _run('Doc reject', () => AdminApi.rejectDriverDoc(docId, reason: r));
              },
              icon: const Icon(Icons.close, size: 16),
              label: const Text('Reject doc'),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _section(String title, List<Widget> children) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          ...children,
        ]),
      ),
    );
  }

  Widget _kv(String k, dynamic v) {
    final text = _v(v);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 140, child: Text(k, style: const TextStyle(color: Colors.black54, fontSize: 13))),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
      ]),
    );
  }

  Widget _actionBar() {
    return FutureBuilder<Map<String, dynamic>>(
      future: _future,
      builder: (context, snap) {
        final data = snap.data ?? <String, dynamic>{};
        final driver = (data['driver'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
        final status = (driver['verification_status'] ?? 'pending').toString();

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final n = await _prompt('Request more info', 'What do you need?');
                    if (n == null || n.isEmpty) return;
                    await _run('Info', () => AdminApi.requestDriverInfo(widget.driverId, note: n));
                  },
                  icon: const Icon(Icons.info_outline),
                  label: const Text('Info'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: status == 'suspended'
                    ? () => _run('Unsuspend', () => AdminApi.unsuspendDriver(widget.driverId))
                    : () async {
                        final r = await _prompt('Suspend driver', 'Reason', required: false);
                        await _run('Suspend', () => AdminApi.suspendDriver(widget.driverId, reason: r));
                      },
                  icon: Icon(status == 'suspended' ? Icons.play_arrow : Icons.pause),
                  label: Text(status == 'suspended' ? 'Unsuspend' : 'Suspend'),
                  style: OutlinedButton.styleFrom(foregroundColor: status == 'suspended' ? Colors.green : Colors.orange),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final r = await _prompt('Reject driver', 'Reason');
                    if (r == null || r.isEmpty) return;
                    await _run('Reject', () => AdminApi.rejectDriver(widget.driverId, reason: r));
                  },
                  icon: const Icon(Icons.close),
                  label: const Text('Reject'),
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton.icon(
                  onPressed: status == 'approved' ? null : () async {
                    final n = await _prompt('Approve driver', 'Optional note', required: false);
                    await _run('Approve', () => AdminApi.approveDriver(widget.driverId, note: n));
                  },
                  icon: const Icon(Icons.check),
                  label: const Text('Approve'),
                ),
              ),
            ]),
          ),
        );
      },
    );
  }
}
