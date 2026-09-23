// lib/screens/pos_screen.dart
// Point of Sale — barcode scan, cart, discount, payment.
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:mobile_scanner/mobile_scanner.dart';
import '../widgets/pvl_logo.dart';

class PosScreen extends StatefulWidget {
  final int storeId;
  final String baseUrl;
  const PosScreen({super.key, required this.storeId, required this.baseUrl});

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _CartLine {
  final int productId;
  final String name;
  final String unit;
  final double unitPrice;
  int qty;
  double discount;
  _CartLine({
    required this.productId,
    required this.name,
    required this.unit,
    required this.unitPrice,
    this.qty = 1,
    this.discount = 0,
  });
  double get gross => unitPrice * qty;
  double get net => (gross - discount).clamp(0, double.infinity);
}

class _PosScreenState extends State<PosScreen> {
  final _barcodeCtrl = TextEditingController();
  final _customerNameCtrl = TextEditingController();
  final _customerPhoneCtrl = TextEditingController();
  final _manualDiscountCtrl = TextEditingController(text: '0');

  final List<_CartLine> _lines = [];
  String _paymentMethod = 'cash';
  bool _busy = false;
  String _status = '';

  double get _subtotal => _lines.fold(0.0, (a, b) => a + b.gross);
  double get _lineDiscounts => _lines.fold(0.0, (a, b) => a + b.discount);
  double get _manualDiscount => double.tryParse(_manualDiscountCtrl.text.trim()) ?? 0;
  double get _totalDiscount => _lineDiscounts + _manualDiscount;
  double get _total => (_subtotal - _totalDiscount).clamp(0, double.infinity);

  Future<void> _lookupBarcode(String raw) async {
    final code = raw.trim();
    if (code.isEmpty) return;
    setState(() => _busy = true);
    try {
      final res = await http.get(Uri.parse('${widget.baseUrl}/product-by-barcode/${widget.storeId}/$code'));
      final data = jsonDecode(res.body);
      if (data['success'] == true && data['product'] != null) {
        _addProductToCart(data['product']);
        _barcodeCtrl.clear();
        _status = 'Added: ${data['product']['name']}';
      } else {
        _status = 'Not found: $code';
      }
    } catch (e) {
      _status = 'Lookup failed: $e';
    } finally {
      setState(() => _busy = false);
    }
  }

  void _addProductToCart(Map<String, dynamic> p) {
    final id = p['id'] as int;
    final existing = _lines.indexWhere((l) => l.productId == id);
    setState(() {
      if (existing >= 0) {
        _lines[existing].qty += 1;
      } else {
        _lines.add(_CartLine(
          productId: id,
          name: (p['name'] ?? 'Unnamed').toString(),
          unit: (p['unit'] ?? '').toString(),
          unitPrice: double.tryParse(p['price'].toString()) ?? 0,
        ));
      }
    });
  }

  Future<void> _openScanner() async {
    final code = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const BarcodeScannerPage()),
    );
    if (code != null && code.isNotEmpty) await _lookupBarcode(code);
  }

  Future<void> _checkout() async {
    if (_lines.isEmpty) { setState(() => _status = 'Cart is empty'); return; }
    setState(() { _busy = true; _status = ''; });
    final totalForMsg = _total;
    try {
      final payload = {
        'store_id': widget.storeId,
        'customer_name': _customerNameCtrl.text.trim().isEmpty ? 'Walk-in' : _customerNameCtrl.text.trim(),
        'customer_phone': _customerPhoneCtrl.text.trim(),
        'payment_method': _paymentMethod,
        'subtotal': _subtotal,
        'discount': _totalDiscount,
        'total': _total,
        'items': _lines.map((l) => {
          'product_id': l.productId,
          'product_name': l.name,
          'unit': l.unit,
          'quantity': l.qty,
          'price': l.unitPrice,
          'total_price': l.net,
        }).toList(),
      };
      final res = await http.post(
        Uri.parse('${widget.baseUrl}/pos-sale'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );
      final data = jsonDecode(res.body);
      if (data['success'] == true) {
        final billId = data['sale_id'] ?? 'N/A';
        setState(() {
          _lines.clear();
          _manualDiscountCtrl.text = '0';
          _customerNameCtrl.clear();
          _customerPhoneCtrl.clear();
          _status = 'Saved bill #$billId  ·  Rs.${_fmt(totalForMsg)}';
        });
      } else {
        _status = 'Save failed: ${data['message'] ?? data['error'] ?? 'unknown'}';
      }
    } catch (e) {
      setState(() => _status = 'Network error: $e');
    } finally {
      setState(() => _busy = false);
    }
  }

  static String _fmt(double v) => v.toStringAsFixed(2);

  @override
  void dispose() {
    _barcodeCtrl.dispose();
    _customerNameCtrl.dispose();
    _customerPhoneCtrl.dispose();
    _manualDiscountCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B5E20),
        foregroundColor: Colors.white,
        titleSpacing: 12,
        title: const PvlLogo(size: 32, showWordmark: true),
        actions: [
          IconButton(
            tooltip: 'Scan barcode',
            onPressed: _busy ? null : _openScanner,
            icon: const Icon(Icons.qr_code_scanner),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            _buildScanBar(),
            if (_status.isNotEmpty) _buildStatus(),
            Expanded(child: _buildCart()),
            _buildCheckoutPanel(),
          ],
        ),
      ),
    );
  }

  Widget _buildScanBar() {
    return Container(
      padding: const EdgeInsets.all(12),
      color: Colors.white,
      child: Row(children: [
        Expanded(
          child: TextField(
            controller: _barcodeCtrl,
            decoration: const InputDecoration(
              hintText: 'Barcode or Product ID',
              prefixIcon: Icon(Icons.tag),
              border: OutlineInputBorder(),
              isDense: true,
            ),
            onSubmitted: _lookupBarcode,
          ),
        ),
        const SizedBox(width: 8),
        FilledButton.icon(
          onPressed: _busy ? null : () => _lookupBarcode(_barcodeCtrl.text),
          icon: const Icon(Icons.search),
          label: const Text('Add'),
          style: FilledButton.styleFrom(backgroundColor: const Color(0xFF1B5E20), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14)),
        ),
        const SizedBox(width: 8),
        FilledButton.icon(
          onPressed: _busy ? null : _openScanner,
          icon: const Icon(Icons.qr_code_scanner),
          label: const Text('Scan'),
          style: FilledButton.styleFrom(backgroundColor: const Color(0xFF0D47A1), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14)),
        ),
      ]),
    );
  }

  Widget _buildStatus() {
    return Container(
      width: double.infinity,
      color: const Color(0xFFFFF8E1),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(children: [
        const Icon(Icons.info_outline, size: 18, color: Colors.black54),
        const SizedBox(width: 8),
        Expanded(child: Text(_status, style: const TextStyle(fontSize: 13))),
      ]),
    );
  }

  Widget _buildCart() {
    if (_lines.isEmpty) {
      return const Center(child: Text('Scan a barcode or type Product ID to start billing', style: TextStyle(color: Colors.black54)));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: _lines.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final l = _lines[i];
        return Container(
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), boxShadow: const [BoxShadow(color: Color(0x11000000), blurRadius: 4, offset: Offset(0, 2))]),
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(l.name, style: const TextStyle(fontWeight: FontWeight.w600))),
              IconButton(onPressed: () => setState(() => _lines.removeAt(i)), icon: const Icon(Icons.close, size: 18)),
            ]),
            Text('Rs.${_fmt(l.unitPrice)}  ${l.unit}', style: const TextStyle(fontSize: 12, color: Colors.black54)),
            const SizedBox(height: 8),
            Row(children: [
              _qtyBtn(Icons.remove, () => setState(() { if (l.qty > 1) l.qty -= 1; })),
              Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text('${l.qty}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
              _qtyBtn(Icons.add, () => setState(() => l.qty += 1)),
              const SizedBox(width: 16),
              Expanded(child: TextFormField(
                initialValue: l.discount.toStringAsFixed(0),
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Discount Rs', border: OutlineInputBorder(), isDense: true),
                onChanged: (v) => setState(() => l.discount = double.tryParse(v.trim()) ?? 0),
              )),
              const SizedBox(width: 12),
              Text('Rs.${_fmt(l.net)}', style: const TextStyle(fontWeight: FontWeight.bold)),
            ]),
          ]),
        );
      },
    );
  }

  Widget _qtyBtn(IconData icon, VoidCallback onTap) => InkWell(
    onTap: onTap,
    child: Container(
      width: 32, height: 32,
      decoration: BoxDecoration(border: Border.all(color: Colors.black26), borderRadius: BorderRadius.circular(6)),
      child: Icon(icon, size: 16),
    ),
  );

  Widget _buildCheckoutPanel() {
    return Container(
      decoration: const BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Color(0x22000000), blurRadius: 6, offset: Offset(0, -2))]),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Expanded(child: TextField(controller: _customerNameCtrl, decoration: const InputDecoration(labelText: 'Customer name (Walk-in if blank)', isDense: true, border: OutlineInputBorder()))),
          const SizedBox(width: 8),
          Expanded(child: TextField(controller: _customerPhoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone', isDense: true, border: OutlineInputBorder()))),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: TextField(controller: _manualDiscountCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Extra discount Rs', isDense: true, border: OutlineInputBorder()), onChanged: (_) => setState(() {}))),
          const SizedBox(width: 8),
          Expanded(child: DropdownButtonFormField<String>(
            value: _paymentMethod,
            decoration: const InputDecoration(labelText: 'Payment', isDense: true, border: OutlineInputBorder()),
            items: const [
              DropdownMenuItem(value: 'cash', child: Text('Cash')),
              DropdownMenuItem(value: 'upi', child: Text('UPI')),
              DropdownMenuItem(value: 'card', child: Text('Card')),
              DropdownMenuItem(value: 'credit', child: Text('Credit / Due')),
            ],
            onChanged: (v) => setState(() => _paymentMethod = v ?? 'cash'),
          )),
        ]),
        const SizedBox(height: 12),
        _sumRow('Subtotal', _subtotal),
        _sumRow('Discount', -_totalDiscount),
        const Divider(),
        _sumRow('TOTAL', _total, bold: true),
        const SizedBox(height: 12),
        SizedBox(height: 52, child: FilledButton.icon(
          onPressed: _busy ? null : _checkout,
          icon: const Icon(Icons.check_circle),
          label: Text(_busy ? 'Saving…' : 'Save Bill  ·  Rs.${_fmt(_total)}'),
          style: FilledButton.styleFrom(backgroundColor: const Color(0xFF1B5E20), foregroundColor: Colors.white, textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        )),
      ]),
    );
  }

  Widget _sumRow(String label, double value, {bool bold = false}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 2),
    child: Row(children: [
      Text(label, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal, fontSize: bold ? 16 : 14)),
      const Spacer(),
      Text('Rs.${_fmt(value)}', style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.w500, fontSize: bold ? 16 : 14)),
    ]),
  );
}

/// Full-screen barcode scanner.
class BarcodeScannerPage extends StatefulWidget {
  const BarcodeScannerPage({super.key});
  @override
  State<BarcodeScannerPage> createState() => _BarcodeScannerPageState();
}

class _BarcodeScannerPageState extends State<BarcodeScannerPage> {
  final _controller = MobileScannerController(detectionSpeed: DetectionSpeed.normal, facing: CameraFacing.back);
  bool _handled = false;

  @override
  void dispose() { _controller.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const PvlLogo(size: 28, showWordmark: true),
        backgroundColor: const Color(0xFF0D47A1),
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.flip_camera_android), onPressed: () => _controller.switchCamera()),
          IconButton(icon: const Icon(Icons.flash_on), onPressed: () => _controller.toggleTorch()),
        ],
      ),
      body: Stack(children: [
        MobileScanner(
          controller: _controller,
          onDetect: (capture) {
            if (_handled) return;
            for (final b in capture.barcodes) {
              final raw = b.rawValue;
              if (raw != null && raw.isNotEmpty) {
                _handled = true;
                Navigator.of(context).pop(raw);
                return;
              }
            }
          },
        ),
        Positioned(left: 0, right: 0, bottom: 24, child: Center(child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(24)),
          child: const Text('Point the camera at a barcode', style: TextStyle(color: Colors.white)),
        ))),
      ]),
    );
  }
}