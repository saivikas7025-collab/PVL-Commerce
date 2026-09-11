/// Delivery address for the signed-in user.
class Address {
  final int id;
  final int userId;
  final String label; // 'Home' | 'Work' | 'Other'
  final String fullAddress;
  final String city;
  final String state;
  final String pincode;
  final double? latitude;
  final double? longitude;
  final bool isDefault;

  const Address({
    required this.id,
    required this.userId,
    required this.label,
    required this.fullAddress,
    required this.city,
    required this.state,
    required this.pincode,
    this.latitude,
    this.longitude,
    this.isDefault = false,
  });

  factory Address.fromJson(Map<String, dynamic> json) {
    double? d(dynamic v) {
      if (v == null) return null;
      return double.tryParse('$v');
    }

    return Address(
      id: int.tryParse('${json['id']}') ?? 0,
      userId: int.tryParse('${json['user_id']}') ?? 0,
      label: '${json['label'] ?? 'Home'}',
      fullAddress: '${json['full_address'] ?? ''}',
      city: '${json['city'] ?? ''}',
      state: '${json['state'] ?? ''}',
      pincode: '${json['pincode'] ?? ''}',
      latitude: d(json['latitude']),
      longitude: d(json['longitude']),
      isDefault: json['is_default'] == true,
    );
  }

  Map<String, dynamic> toBody() => {
        'label': label,
        'full_address': fullAddress,
        'city': city,
        'state': state,
        'pincode': pincode,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        'is_default': isDefault,
      };

  Address copyWith({
    String? label,
    String? fullAddress,
    String? city,
    String? state,
    String? pincode,
    double? latitude,
    double? longitude,
    bool? isDefault,
  }) {
    return Address(
      id: id,
      userId: userId,
      label: label ?? this.label,
      fullAddress: fullAddress ?? this.fullAddress,
      city: city ?? this.city,
      state: state ?? this.state,
      pincode: pincode ?? this.pincode,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      isDefault: isDefault ?? this.isDefault,
    );
  }
}
