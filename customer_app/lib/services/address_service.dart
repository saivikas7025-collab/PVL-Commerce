import 'api_client.dart';
import 'auth_service.dart';
import '../models/address.dart';

class AddressService {
  static Future<List<Address>> list() async {
    final token = await AuthService.getToken();
    final data = await ApiClient.get('/addresses', token: token);
    final rows = (data is Map ? (data['addresses'] as List? ?? []) : []);
    return rows.map((e) => Address.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  static Future<Address> create(Address address) async {
    final token = await AuthService.getToken();
    final data = await ApiClient.post('/addresses', address.toBody(), token: token);
    return Address.fromJson(Map<String, dynamic>.from(data['address'] as Map));
  }

  static Future<Address> update(int id, Address address) async {
    final token = await AuthService.getToken();
    final data = await ApiClient.put('/addresses/$id', address.toBody(), token: token);
    return Address.fromJson(Map<String, dynamic>.from(data['address'] as Map));
  }

  static Future<Address> setDefault(int id) async {
    final token = await AuthService.getToken();
    final data = await ApiClient.put('/addresses/$id/default', {}, token: token);
    return Address.fromJson(Map<String, dynamic>.from(data['address'] as Map));
  }

  static Future<void> remove(int id) async {
    final token = await AuthService.getToken();
    await ApiClient.delete('/addresses/$id', token: token);
  }
}
