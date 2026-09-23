import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../services/driver_kyc_api.dart';

class DriverKycScreen extends StatefulWidget {
  final int driverId;
  const DriverKycScreen({super.key, this.driverId = 1});
  @override
  State<DriverKycScreen> createState() => _DriverKycScreenState();
}

class _DocReq {
  final String code;
  final String label;
  final String hint;
  final bool needsBack;
  const _DocReq(this.code, this.label, this.hint, {this.needsBack = false});
}

const List<_DocReq> _DOCS = [
  _DocReq('IDENTITY', 'Aadhaar / ID Proof', 'Enter last 4 digits', needsBack: true),
  _DocReq('DL',       'Driving Licence',    'Enter DL number',      needsBack: true),
  _DocReq('RC',       'Vehicle RC',         'Enter RC number'),
  _DocReq('INSURANCE','Vehicle Insurance',  'Enter policy number'),
  _DocReq('ADDRESS',  'Address Proof',      'Electricity bill / rent agreement'),
  _DocReq('PAN',      'PAN Card',           'Enter PAN'),
  _DocReq('BANK',     'Bank / UPI Proof',   'Cancelled cheque or passbook'),
  _DocReq('SELFIE',   'Live Selfie',        'Front facing camera'),
];

class _DriverKycScreenState extends State<DriverKycScreen> {
  Map<String, dynamic>? _state;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final s = await DriverKycApi.status(widget.driverId);
      if (!mounted) return;
      setState(() { _state = s; _loading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _pickAndUpload(_DocReq req) async {
    try {
      final res = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif'],
        withData: true,
      );
      if (res == null || res.files.isEmpty) return;
      final f = res.files.first;
      final bytes = f.bytes;
      if (bytes == null) { _snack('Cannot read file bytes'); return; }

      // Ask for doc number + optional expiry
      final meta = await _promptMeta(req);
      if (meta == null) return;

      _snack('Uploading ${req.label}…');

      final up = await DriverKycApi.uploadFile(
        driverId: widget.driverId,
        docType: req.code,
        filename: f.name,
        bytes: bytes,
        mimeType: _mimeForExt(f.name),
      );

      final fileId = (up['file']?['fileId'] ?? '').toString();
      if (fileId.isEmpty) throw Exception('No fileId returned');

      await DriverKycApi.registerDocument(
        driverId: widget.driverId,
        docType: req.code,
        docNumber: meta['number'] ?? '',
        frontUrl: fileId,
        expiryDate: meta['expiry'],
      );

      _snack('${req.label} uploaded');
      await _load();
    } catch (e) {
      _snack('Upload failed: $e');
    }
  }

  Future<Map<String, String?>?> _promptMeta(_DocReq req) async {
    final numCtrl = TextEditingController();
    final expCtrl = TextEditingController();
    return showDialog<Map<String, String?>>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${req.label} — details'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: numCtrl,
                decoration: InputDecoration(hintText: req.hint)),
            const SizedBox(height: 8),
            TextField(controller: expCtrl,
                decoration: const InputDecoration(hintText: 'Expiry date (YYYY-MM-DD, optional)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, {
              'number': numCtrl.text.trim(),
              'expiry': expCtrl.text.trim().isEmpty ? null : expCtrl.text.trim(),
            }),
            child: const Text('Save & upload'),
          ),
        ],
      ),
    );
  }

  String _mimeForExt(String name) {
    final n = name.toLowerCase();
    if (n.endsWith('.pdf')) return 'application/pdf';
    if (n.endsWith('.png')) return 'image/png';
    if (n.endsWith('.heic')) return 'image/heic';
    if (n.endsWith('.heif')) return 'image/heif';
    return 'image/jpeg';
  }

  void _snack(String s) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(s)));
  }

  Map<String, dynamic> _docByType(List docs, String type) {
    for (final d in docs) {
      if ((d['doc_type'] ?? '').toString().toUpperCase() == type) return d as Map<String, dynamic>;
    }
    return const {};
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KYC Verification'),
        actions: [IconButton(onPressed: _load, icon: const Icon(Icons.refresh))],
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
          ? Center(child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(_error!, textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(onPressed: _load, child: const Text('Retry')),
              ]),
            ))
          : _buildBody(),
    );
  }

  Widget _buildBody() {
    final s = _state ?? {};
    final driver = (s['driver'] as Map?)?.cast<String, dynamic>() ?? {};
    final docs = (s['documents'] as List?) ?? const [];
    final v = (s['verification'] as Map?)?.cast<String, dynamic>() ?? {};

    final status = (driver['verification_status'] ?? 'pending').toString();
    final risk = (driver['risk_state'] ?? 'NORMAL').toString();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _statusCard(status, risk, driver['rejection_reason']?.toString()),
        const SizedBox(height: 16),
        const Text('Required documents',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
        const SizedBox(height: 8),
        for (final r in _DOCS) _docTile(r, _docByType(docs, r.code)),
        const SizedBox(height: 24),
        FilledButton.icon(
          onPressed: () async {
            try {
              await DriverKycApi.submit(widget.driverId);
              _snack('Submitted for review');
              await _load();
            } catch (e) { _snack('Submit failed: $e'); }
          },
          icon: const Icon(Icons.send),
          label: const Text('Submit for review'),
        ),
        const SizedBox(height: 30),
      ],
    );
  }

  Widget _statusCard(String status, String risk, String? rejection) {
    Color c;
    switch (status) {
      case 'approved':      c = Colors.green; break;
      case 'rejected':      c = Colors.red; break;
      case 'under_review':  c = Colors.orange; break;
      case 'suspended':     c = Colors.red; break;
      default:              c = Colors.blueGrey;
    }
    return Card(
      color: c.withValues(alpha: 0.10),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(Icons.verified_user, color: c),
            const SizedBox(width: 8),
            Text('Status: ${status.replaceAll('_', ' ')}',
                style: TextStyle(color: c, fontWeight: FontWeight.w600, fontSize: 16)),
          ]),
          const SizedBox(height: 6),
          Text('Risk state: $risk', style: const TextStyle(fontSize: 12, color: Colors.black54)),
          if (rejection != null && rejection.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Note: $rejection',
                  style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
            ),
        ]),
      ),
    );
  }

  Widget _docTile(_DocReq req, Map<String, dynamic> existing) {
    final has = existing.isNotEmpty;
    final st = (existing['status'] ?? 'not uploaded').toString();
    Color c;
    switch (st) {
      case 'approved': c = Colors.green; break;
      case 'rejected': c = Colors.red; break;
      case 'pending':  c = Colors.orange; break;
      default:         c = Colors.grey;
    }
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListTile(
        leading: Icon(
          has ? Icons.check_circle : Icons.upload_file,
          color: has ? c : Colors.grey,
        ),
        title: Text(req.label),
        subtitle: has
            ? Text('${st.replaceAll('_', ' ')}'
                + (existing['doc_number'] != null && (existing['doc_number'] as String).isNotEmpty
                    ? ' · ${existing['doc_number']}'
                    : ''))
            : const Text('Tap to upload'),
        trailing: IconButton(
          icon: const Icon(Icons.upload),
          onPressed: () => _pickAndUpload(req),
        ),
        onTap: () => _pickAndUpload(req),
      ),
    );
  }
}
