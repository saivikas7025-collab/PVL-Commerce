import 'package:flutter/foundation.dart';
import '../models/address.dart';
import '../services/address_service.dart';

class AddressProvider extends ChangeNotifier {
  List<Address> _addresses = [];
  bool _loading = false;
  String? _error;

  List<Address> get addresses => List.unmodifiable(_addresses);
  bool get loading => _loading;
  String? get error => _error;

  Address? get defaultAddress {
    for (final a in _addresses) {
      if (a.isDefault) return a;
    }
    return _addresses.isEmpty ? null : _addresses.first;
  }

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _addresses = await AddressService.list();
    } catch (e) {
      _error = 'Could not load addresses. ${e.toString().replaceFirst("Exception: ", "")}';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<Address> add(Address a) async {
    final created = await AddressService.create(a);
    await refresh();
    return created;
  }

  Future<Address> update(int id, Address a) async {
    final updated = await AddressService.update(id, a);
    await refresh();
    return updated;
  }

  Future<void> setDefault(int id) async {
    await AddressService.setDefault(id);
    await refresh();
  }

  Future<void> remove(int id) async {
    await AddressService.remove(id);
    await refresh();
  }

  void reset() {
    _addresses = [];
    _loading = false;
    _error = null;
    notifyListeners();
  }
}
