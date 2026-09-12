import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'config/api_config.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:fl_chart/fl_chart.dart';

void main() => runApp(const AdminApp());

class AdminApp extends StatelessWidget {
  const AdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'PVL Commerce Admin',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0D47A1),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF4F6FA),
      ),
      home: const LoginPage(),
    );
  }
}

// ---------- Helper ----------
double _parseDouble(dynamic value) {
  if (value == null) return 0.0;
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0.0;
  return 0.0;
}

// ---------- Login Page ----------
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _loading = false;
  String _error = '';

  Future<void> _login() async {
    setState(() { _loading = true; _error = ''; });
    try {
      // ✅ CORRECT endpoint: /api/auth/login
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone': _phoneController.text.trim(),
          'password': _passwordController.text.trim(),
        }),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final token = (data['token'] ?? '').toString();
          final user = data['user'] as Map<String, dynamic>?;
          // Verify admin role
          if (user == null || user['role'] != 'admin') {
            setState(() {
              _error = 'Access restricted to admin users.';
              _loading = false;
            });
            return;
          }
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (_) => AdminDashboard(token: token),
            ),
          );
          return;
        }
      }
      setState(() { _error = 'Invalid credentials'; });
    } catch (e) {
      setState(() { _error = 'Server error: $e'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.dashboard, size: 80, color: Color(0xFF0D47A1)),
              const SizedBox(height: 16),
              const Text('PVL Admin', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Admin Login', style: TextStyle(fontSize: 16, color: Colors.grey)),
              const SizedBox(height: 32),
              TextField(
                controller: _phoneController,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  prefixText: '+91 ',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
              ),
              const SizedBox(height: 16),
              if (_error.isNotEmpty) Text(_error, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _loading ? null : _login,
                  child: _loading ? const CircularProgressIndicator() : const Text('Login'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------- Main Dashboard (Admin only) ----------
class AdminDashboard extends StatefulWidget {
  final String token;

  const AdminDashboard({super.key, required this.token});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  final String _apiBase = ApiConfig.baseUrl;
  final String _socketBase = ApiConfig.socketUrl;
  late IO.Socket _socket;

  List<dynamic> _orders = [];
  bool _loading = true;
  String _error = '';

  Map<int, Map<String, dynamic>> _liveLocations = {};
  Map<int, String> _orderStatuses = {};
  List<Map<String, dynamic>> _customerFeedbacks = [];
  List<Map<String, dynamic>> _driverFeedbacks = [];
  List<Map<String, dynamic>> _stores = [];
  List<Map<String, dynamic>> _drivers = [];

  int _selectedTab = 0;
  String _orderFilter = 'all';

  Map<String, String> get _headers => {
        'Authorization': 'Bearer ${widget.token}',
        'Content-Type': 'application/json',
      };

  @override
  void initState() {
    super.initState();
    _connectSocket();
    _loadData();
  }

  @override
  void dispose() {
    _socket.dispose();
    super.dispose();
  }

  void _connectSocket() {
    _socket = IO.io(_socketBase, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
    });

    _socket.onConnect((_) {
      debugPrint('Admin socket connected');
      _socket.emit('admin:join', {'role': 'admin'});
    });

    _socket.on('location:update', (data) {
      final orderId = data['orderId'] as int;
      setState(() {
        _liveLocations[orderId] = {
          'lat': data['lat'] ?? data['latitude'],
          'lng': data['lng'] ?? data['longitude'],
          'timestamp': DateTime.now().toIso8601String(),
          'partnerId': data['deliveryPartnerId'] ?? data['partnerId'],
        };
      });
    });

    _socket.on('order:status', (data) {
      final orderId = data['orderId'] as int;
      final status = data['status'] as String;
      setState(() {
        _orderStatuses[orderId] = status;
        final index = _orders.indexWhere((o) => o['id'] == orderId);
        if (index != -1) _orders[index]['status'] = status;
      });
    });

    _socket.on('feedback:customer', (data) {
      setState(() {
        _customerFeedbacks.insert(0, {
          'id': DateTime.now().millisecondsSinceEpoch,
          ...data,
          'timestamp': DateTime.now().toIso8601String(),
        });
        if (_customerFeedbacks.length > 50) _customerFeedbacks.removeLast();
      });
    });

    _socket.on('feedback:driver', (data) {
      setState(() {
        _driverFeedbacks.insert(0, {
          'id': DateTime.now().millisecondsSinceEpoch,
          ...data,
          'timestamp': DateTime.now().toIso8601String(),
        });
        if (_driverFeedbacks.length > 50) _driverFeedbacks.removeLast();
      });
    });

    _socket.onDisconnect((_) => debugPrint('Admin socket disconnected'));
    _socket.onError((e) => debugPrint('Socket error: $e'));
  }

  Future<void> _loadData() async {
    setState(() { _loading = true; _error = ''; });

    try {
      final response = await http.get(
        Uri.parse('$_apiBase/admin/orders'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final orders = data['rows'] ?? data['orders'] ?? data['data'] ?? [];
        if (orders is List) {
          setState(() {
            _orders = orders;
            _extractStoresAndDrivers(orders);
            _loading = false;
          });
          debugPrint('Loaded ${orders.length} orders from /api/admin/orders');
          return;
        }
      }

      // Fallback to dashboard endpoint
      final dashResponse = await http.get(
        Uri.parse('$_apiBase/admin/dashboard'),
        headers: _headers,
      );
      if (dashResponse.statusCode == 200) {
        final dashData = jsonDecode(dashResponse.body);
        final orders2 = dashData['recent_orders'] ?? dashData['rows'] ?? dashData['orders'] ?? [];
        setState(() {
          _orders = orders2;
          _extractStoresAndDrivers(orders2);
          _loading = false;
        });
        debugPrint('Loaded ${orders2.length} orders from /api/admin/dashboard');
        return;
      }

      throw Exception('Failed to fetch orders: ${response.statusCode} and dashboard: ${dashResponse.statusCode}');
    } catch (e) {
      setState(() {
        _error = 'Failed to load admin data: $e';
        _loading = false;
      });
      debugPrint('Error loading admin data: $e');
    }
  }

  void _extractStoresAndDrivers(List<dynamic> orders) {
    final storeMap = <String, Map<String, dynamic>>{};
    final driverMap = <String, Map<String, dynamic>>{};
    for (var order in orders) {
      final storeName = order['store_name'] ?? order['store']?['name'];
      if (storeName != null) {
        storeMap[storeName] = {
          'name': storeName,
          'id': order['store_id'] ?? order['store']?['id'] ?? storeMap.length + 1,
          'phone': order['store_phone'] ?? order['store']?['phone'] ?? 'N/A',
          'is_active': true,
        };
      }
      final driverName = order['delivery_partner_name'] ?? order['delivery_partner']?['name'];
      if (driverName != null) {
        driverMap[driverName] = {
          'name': driverName,
          'id': order['delivery_partner_id'] ?? order['delivery_partner']?['id'] ?? driverMap.length + 1,
          'phone': order['delivery_partner_phone'] ?? order['delivery_partner']?['phone'] ?? 'N/A',
          'status': 'online',
        };
      }
    }
    setState(() {
      _stores = storeMap.values.toList();
      _drivers = driverMap.values.toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: _selectedTab,
            onDestinationSelected: (index) => setState(() => _selectedTab = index),
            labelType: NavigationRailLabelType.selected,
            destinations: const [
              NavigationRailDestination(
                icon: Icon(Icons.dashboard_outlined),
                selectedIcon: Icon(Icons.dashboard),
                label: Text('Dashboard'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.map_outlined),
                selectedIcon: Icon(Icons.map),
                label: Text('Live Tracking'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.receipt_long_outlined),
                selectedIcon: Icon(Icons.receipt_long),
                label: Text('Orders'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.feedback_outlined),
                selectedIcon: Icon(Icons.feedback),
                label: Text('Feedback'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.storefront_outlined),
                selectedIcon: Icon(Icons.storefront),
                label: Text('Stores'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.delivery_dining_outlined),
                selectedIcon: Icon(Icons.delivery_dining),
                label: Text('Drivers'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.account_balance_wallet_outlined),
                selectedIcon: Icon(Icons.account_balance_wallet),
                label: Text('Finance'),
              ),
            ],
          ),
          const VerticalDivider(thickness: 1, width: 1),
          Expanded(
            child: IndexedStack(
              index: _selectedTab,
              children: [
                _buildDashboard(),
                _buildLiveTracking(),
                _buildOrders(),
                _buildFeedback(),
                _buildStores(),
                _buildDrivers(),
                _buildFinance(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ---------- Dashboard ----------
  Widget _buildDashboard() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error.isNotEmpty) return _errorWidget(_error);

    int totalOrders = _orders.length;
    int pendingOrders = _orders.where((o) {
      final status = _orderStatuses[o['id']] ?? o['status'] ?? '';
      return status.toLowerCase() == 'pending' || status.toLowerCase() == 'ready_for_pickup';
    }).length;
    int activeDeliveries = _orders.where((o) {
      final status = _orderStatuses[o['id']] ?? o['status'] ?? '';
      return status.toLowerCase() == 'out_for_delivery';
    }).length;

    double todaySales = 0.0;
    double totalRevenue = 0.0;
    final now = DateTime.now();
    for (var order in _orders) {
      final amt = _parseDouble(order['total_amount']);
      totalRevenue += amt;
      final createdAt = order['created_at'];
      if (createdAt != null) {
        try {
          final date = DateTime.parse(createdAt);
          if (date.year == now.year && date.month == now.month && date.day == now.day) {
            todaySales += amt;
          }
        } catch (e) {}
      }
    }
    final customerIds = <dynamic>{};
    for (var order in _orders) {
      final id = order['customer_id'] ?? order['customer']?['id'];
      if (id != null) customerIds.add(id);
    }
    int customers = customerIds.length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Dashboard', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
              Row(
                children: [
                  const CircleAvatar(radius: 8, backgroundColor: Colors.green),
                  const SizedBox(width: 8),
                  const Text('System Live'),
                  const SizedBox(width: 16),
                  IconButton(onPressed: _loadData, icon: const Icon(Icons.refresh)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              _metricCard('Total Orders', '$totalOrders', Icons.receipt_long, Colors.blue, 200),
              _metricCard('Pending', '$pendingOrders', Icons.pending, Colors.orange, 200),
              _metricCard('Today\'s Sales', '₹${todaySales.toStringAsFixed(2)}', Icons.attach_money, Colors.green, 200),
              _metricCard('Revenue', '₹${totalRevenue.toStringAsFixed(2)}', Icons.account_balance, Colors.purple, 200),
              _metricCard('Customers', '$customers', Icons.people, Colors.teal, 200),
              _metricCard('Active Deliveries', '$activeDeliveries', Icons.delivery_dining, Colors.red, 200),
            ],
          ),
          const SizedBox(height: 32),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Sales Trend (Last 7 Days)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 16),
                        SizedBox(
                          height: 200,
                          child: LineChart(
                            LineChartData(
                              gridData: const FlGridData(show: false),
                              titlesData: const FlTitlesData(
                                leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                bottomTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    getTitlesWidget: _bottomTitleWidget,
                                  ),
                                ),
                              ),
                              borderData: FlBorderData(show: false),
                              lineBarsData: [
                                LineChartBarData(
                                  spots: const [
                                    FlSpot(0, 1), FlSpot(1, 3), FlSpot(2, 2.5),
                                    FlSpot(3, 5), FlSpot(4, 4), FlSpot(5, 7), FlSpot(6, 6)
                                  ],
                                  isCurved: true,
                                  color: Colors.blue,
                                  barWidth: 3,
                                  belowBarData: BarAreaData(show: true, color: Colors.blue.withOpacity(0.15)),
                                  dotData: const FlDotData(show: false),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 1,
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Order Status Breakdown', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        _buildStatusBreakdown(),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Recent Orders', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  _orders.isEmpty
                      ? const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: Text('No orders')))
                      : SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: DataTable(
                            columns: const [
                              DataColumn(label: Text('Order ID')),
                              DataColumn(label: Text('Customer')),
                              DataColumn(label: Text('Total')),
                              DataColumn(label: Text('Status')),
                              DataColumn(label: Text('Payment')),
                              DataColumn(label: Text('Created')),
                            ],
                            rows: _orders.take(10).map((order) {
                              final orderId = order['id'];
                              final status = _orderStatuses[orderId] ?? order['status'] ?? 'N/A';
                              final customer = order['customer_name'] ?? order['customer']?['name'] ?? 'N/A';
                              return DataRow(cells: [
                                DataCell(Text('#PVL$orderId')),
                                DataCell(Text(customer)),
                                DataCell(Text('₹${_parseDouble(order['total_amount']).toStringAsFixed(2)}')),
                                DataCell(_statusChip(status)),
                                DataCell(Text(order['payment_status'] ?? 'N/A')),
                                DataCell(Text(order['created_at'] != null ? DateTime.parse(order['created_at']).toLocal().toString().substring(0, 16) : 'N/A')),
                              ]);
                            }).toList(),
                          ),
                        ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBreakdown() {
    final Map<String, int> statusCount = {};
    for (var order in _orders) {
      final status = _orderStatuses[order['id']] ?? order['status'] ?? 'unknown';
      statusCount[status] = (statusCount[status] ?? 0) + 1;
    }
    if (statusCount.isEmpty) return const Text('No data');
    return Column(
      children: statusCount.entries.map((e) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: Text(e.key.toUpperCase(), style: const TextStyle(fontSize: 12)),
              ),
              Expanded(
                flex: 1,
                child: LinearProgressIndicator(
                  value: e.value / _orders.length,
                  backgroundColor: Colors.grey.shade200,
                  color: _statusColor(e.key),
                ),
              ),
              const SizedBox(width: 8),
              Text('${e.value}', style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
        );
      }).toList(),
    );
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'delivered': return Colors.green;
      case 'pending': return Colors.orange;
      case 'cancelled': return Colors.red;
      case 'out_for_delivery': return Colors.blue;
      default: return Colors.grey;
    }
  }

  // ---------- Live Tracking ----------
  Widget _buildLiveTracking() {
    final markers = _liveLocations.entries.map((entry) {
      final loc = entry.value;
      return Marker(
        point: LatLng(loc['lat'] ?? 0.0, loc['lng'] ?? 0.0),
        width: 80,
        height: 80,
        child: Column(
          children: [
            const Icon(Icons.delivery_dining, color: Colors.blue, size: 40),
            Text('Order #${entry.key}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Tracking', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          Text('${_liveLocations.length} active drivers', style: const TextStyle(fontSize: 14)),
          const SizedBox(width: 16),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 3,
            child: FlutterMap(
              options: MapOptions(
                initialCenter: const LatLng(17.3850, 78.4867),
                initialZoom: 12.0,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.pvlcommerce.admin',
                ),
                MarkerLayer(markers: markers),
                RichAttributionWidget(attributions: [TextSourceAttribution('OpenStreetMap contributors')]),
              ],
            ),
          ),
          Expanded(
            flex: 1,
            child: Card(
              margin: const EdgeInsets.all(8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Active Orders', style: TextStyle(fontWeight: FontWeight.bold)),
                    const Divider(),
                    Expanded(
                      child: _liveLocations.isEmpty
                          ? const Center(child: Text('No active drivers'))
                          : ListView.builder(
                              itemCount: _liveLocations.length,
                              itemBuilder: (_, i) {
                                final orderId = _liveLocations.keys.elementAt(i);
                                final loc = _liveLocations[orderId]!;
                                return ListTile(
                                  leading: const Icon(Icons.person_pin_circle, color: Colors.blue),
                                  title: Text('Order #PVL$orderId'),
                                  subtitle: Text('Lat: ${loc['lat']?.toStringAsFixed(5)}, Lng: ${loc['lng']?.toStringAsFixed(5)}'),
                                  trailing: Text('Updated: ${loc['timestamp'] != null ? DateTime.parse(loc['timestamp']).toLocal().toString().substring(11, 16) : 'N/A'}'),
                                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => OrderDetailPage(orderId: orderId, token: widget.token))),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ---------- Orders ----------
  Widget _buildOrders() {
    List<dynamic> filteredOrders = _orders;
    if (_orderFilter != 'all') {
      filteredOrders = _orders.where((order) {
        final status = _orderStatuses[order['id']] ?? order['status'] ?? '';
        return status.toLowerCase() == _orderFilter;
      }).toList();
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders'),
        actions: [
          DropdownButton<String>(
            value: _orderFilter,
            onChanged: (val) => setState(() => _orderFilter = val!),
            items: const [
              DropdownMenuItem(value: 'all', child: Text('All')),
              DropdownMenuItem(value: 'pending', child: Text('Pending')),
              DropdownMenuItem(value: 'ready_for_pickup', child: Text('Ready')),
              DropdownMenuItem(value: 'out_for_delivery', child: Text('Out for Delivery')),
              DropdownMenuItem(value: 'delivered', child: Text('Delivered')),
              DropdownMenuItem(value: 'cancelled', child: Text('Cancelled')),
            ],
          ),
          IconButton(onPressed: _loadData, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: filteredOrders.isEmpty
          ? const Center(child: Text('No orders'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: filteredOrders.length,
              itemBuilder: (_, i) {
                final order = filteredOrders[i];
                final orderId = order['id'];
                final status = _orderStatuses[orderId] ?? order['status'] ?? 'N/A';
                final hasLocation = _liveLocations.containsKey(orderId);
                final customer = order['customer_name'] ?? order['customer']?['name'] ?? 'N/A';
                return Card(
                  child: ListTile(
                    leading: const Icon(Icons.receipt_long),
                    title: Text('#PVL$orderId - $customer'),
                    subtitle: Text('Total: ₹${_parseDouble(order['total_amount']).toStringAsFixed(2)} • ${order['payment_method'] ?? 'N/A'}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _statusChip(status),
                        if (hasLocation) const Icon(Icons.location_on, color: Colors.blue, size: 16),
                      ],
                    ),
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => OrderDetailPage(orderId: orderId, token: widget.token)));
                    },
                  ),
                );
              },
            ),
    );
  }

  // ---------- Feedback ----------
  Widget _buildFeedback() {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Feedback'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Customer'),
              Tab(text: 'Driver'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _feedbackList(_customerFeedbacks, 'customer'),
            _feedbackList(_driverFeedbacks, 'driver'),
          ],
        ),
      ),
    );
  }

  Widget _feedbackList(List<Map<String, dynamic>> items, String type) {
    if (items.isEmpty) {
      return const Center(child: Text('No feedback yet'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (_, i) {
        final f = items[i];
        return Card(
          child: ListTile(
            leading: CircleAvatar(
              child: Icon(type == 'customer' ? Icons.person : Icons.delivery_dining),
            ),
            title: Text(f['message'] ?? 'No message'),
            subtitle: Text('Rating: ${f['rating'] ?? 'N/A'} • ${f['timestamp'] != null ? DateTime.parse(f['timestamp']).toLocal().toString().substring(0, 16) : ''}'),
          ),
        );
      },
    );
  }

  // ---------- Stores ----------
  Widget _buildStores() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Stores'),
        actions: [
          IconButton(onPressed: _loadData, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _stores.isEmpty
          ? const Center(child: Text('No stores found (extracted from orders)'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _stores.length,
              itemBuilder: (_, i) {
                final store = _stores[i];
                return Card(
                  child: ListTile(
                    leading: const Icon(Icons.storefront, color: Colors.green),
                    title: Text(store['name'] ?? 'Store #${store['id']}'),
                    subtitle: Text('Phone: ${store['phone'] ?? 'N/A'}'),
                    trailing: const Chip(label: Text('Active'), backgroundColor: Colors.green, labelStyle: TextStyle(color: Colors.white)),
                  ),
                );
              },
            ),
    );
  }

  // ---------- Drivers ----------
  Widget _buildDrivers() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Drivers'),
        actions: [
          IconButton(onPressed: _loadData, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _drivers.isEmpty
          ? const Center(child: Text('No drivers found (extracted from orders)'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _drivers.length,
              itemBuilder: (_, i) {
                final driver = _drivers[i];
                final isOnline = driver['status'] == 'online';
                final hasLocation = _liveLocations.values.any((loc) => loc['partnerId'] == driver['id']);
                return Card(
                  child: ListTile(
                    leading: CircleAvatar(child: Icon(Icons.person, color: isOnline ? Colors.green : Colors.grey)),
                    title: Text(driver['name'] ?? 'Driver #${driver['id']}'),
                    subtitle: Text('Phone: ${driver['phone'] ?? 'N/A'} • ${isOnline ? 'Online' : 'Offline'}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isOnline) const Icon(Icons.circle, color: Colors.green, size: 12),
                        if (hasLocation) const Icon(Icons.location_on, color: Colors.blue, size: 16),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  // ---------- Finance ----------
  Widget _buildFinance() {
    double totalRevenue = 0.0;
    double totalDeliveryFee = 0.0;
    double totalDiscount = 0.0;
    int deliveredCount = 0;

    for (var order in _orders) {
      final status = _orderStatuses[order['id']] ?? order['status'] ?? '';
      if (status.toLowerCase() == 'delivered') {
        final amt = _parseDouble(order['total_amount']);
        final fee = _parseDouble(order['delivery_fee']);
        final disc = _parseDouble(order['discount']);
        totalRevenue += amt;
        totalDeliveryFee += fee;
        totalDiscount += disc;
        deliveredCount++;
      }
    }
    final commissionRate = 0.15;
    final totalCommission = totalRevenue * commissionRate;
    final totalProfit = totalRevenue - totalDeliveryFee - totalDiscount - totalCommission;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Finance & Settlement', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              _metricCard('Total Revenue', '₹${totalRevenue.toStringAsFixed(2)}', Icons.attach_money, Colors.green, 200),
              _metricCard('Total Delivery Fees', '₹${totalDeliveryFee.toStringAsFixed(2)}', Icons.local_shipping, Colors.blue, 200),
              _metricCard('Total Discounts', '₹${totalDiscount.toStringAsFixed(2)}', Icons.local_offer, Colors.orange, 200),
              _metricCard('Platform Commission', '₹${totalCommission.toStringAsFixed(2)}', Icons.account_balance, Colors.purple, 200),
              _metricCard('Estimated Profit', '₹${totalProfit.toStringAsFixed(2)}', Icons.trending_up, Colors.teal, 200),
              _metricCard('Delivered Orders', '$deliveredCount', Icons.check_circle, Colors.green, 200),
            ],
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Settlement Summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  DataTable(
                    columns: const [
                      DataColumn(label: Text('Metric')),
                      DataColumn(label: Text('Amount (₹)')),
                    ],
                    rows: [
                      DataRow(cells: [DataCell(Text('Total Orders Value')), DataCell(Text(totalRevenue.toStringAsFixed(2)))]),
                      DataRow(cells: [DataCell(Text('Delivery Fees Collected')), DataCell(Text(totalDeliveryFee.toStringAsFixed(2)))]),
                      DataRow(cells: [DataCell(Text('Discounts Given')), DataCell(Text(totalDiscount.toStringAsFixed(2)))]),
                      DataRow(cells: [DataCell(Text('Platform Commission (15%)')), DataCell(Text(totalCommission.toStringAsFixed(2)))]),
                      DataRow(cells: [DataCell(Text('Net Payable to Stores')), DataCell(Text((totalRevenue - totalCommission - totalDeliveryFee).toStringAsFixed(2)))]),
                      DataRow(cells: [DataCell(Text('Estimated Profit')), DataCell(Text(totalProfit.toStringAsFixed(2)))]),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ---------- Helpers ----------
  Widget _metricCard(String title, String value, IconData icon, Color color, double width) {
    return SizedBox(
      width: width,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(icon, color: color),
                  const SizedBox(width: 8),
                  Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey)),
                ],
              ),
              Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusChip(String status) {
    Color bgColor, textColor;
    switch (status.toLowerCase()) {
      case 'delivered':
        bgColor = Colors.green.shade100;
        textColor = Colors.green.shade800;
        break;
      case 'pending':
        bgColor = Colors.orange.shade100;
        textColor = Colors.orange.shade800;
        break;
      case 'cancelled':
        bgColor = Colors.red.shade100;
        textColor = Colors.red.shade800;
        break;
      case 'out_for_delivery':
        bgColor = Colors.blue.shade100;
        textColor = Colors.blue.shade800;
        break;
      default:
        bgColor = Colors.grey.shade200;
        textColor = Colors.grey.shade800;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(12)),
      child: Text(status, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: textColor)),
    );
  }

  Widget _errorWidget(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 12),
          Text('Error: $message', textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _loadData, child: const Text('Retry')),
        ],
      ),
    );
  }

  static Widget _bottomTitleWidget(double value, TitleMeta meta) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return Text(days[value.toInt() % days.length], style: const TextStyle(fontSize: 10, color: Colors.grey));
  }
}

// ---------- Order Detail Page ----------
class OrderDetailPage extends StatefulWidget {
  final int orderId;
  final String token;

  const OrderDetailPage({super.key, required this.orderId, required this.token});

  @override
  State<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends State<OrderDetailPage> {
  Map<String, dynamic> _orderData = {};
  List<dynamic> _items = [];
  Map<String, dynamic>? _location;
  bool _loading = true;
  String _error = '';
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _fetchOrderDetails();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _fetchLocation());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _fetchOrderDetails() async {
    setState(() { _loading = true; _error = ''; });
    try {
      // Use admin endpoint first
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/admin/order/${widget.orderId}'),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        _orderData = body['order'] ?? body;
        _items = _orderData['items'] ?? body['items'] ?? [];
        setState(() { _loading = false; });
        return;
      }
      // Fallback to delivery endpoint if admin endpoint not available
      final fallback = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/delivery/order/${widget.orderId}'),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );
      if (fallback.statusCode == 200) {
        final body = jsonDecode(fallback.body);
        _orderData = body['order'] ?? body;
        _items = _orderData['items'] ?? body['items'] ?? [];
        setState(() { _loading = false; });
        return;
      }
      throw Exception('Failed to load order details');
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _fetchLocation() async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/live-location/${widget.orderId}'),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['location'] != null) {
          setState(() {
            _location = Map<String, dynamic>.from(data['location']);
          });
        }
      }
    } catch (e) { /* ignore */ }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_error.isNotEmpty) return Scaffold(body: Center(child: Text(_error)));

    final status = _orderData['status'] ?? 'N/A';
    final total = _parseDouble(_orderData['total_amount']);
    final subtotal = _parseDouble(_orderData['subtotal']);
    final deliveryFee = _parseDouble(_orderData['delivery_fee']);
    final discount = _parseDouble(_orderData['discount']);
    final paymentMethod = _orderData['payment_method'] ?? 'N/A';
    final paymentStatus = _orderData['payment_status'] ?? 'N/A';
    final customerName = _orderData['customer_name'] ?? _orderData['customer']?['name'] ?? 'N/A';
    final customerPhone = _orderData['customer_phone'] ?? _orderData['customer']?['phone'] ?? 'N/A';
    final storeName = _orderData['store_name'] ?? _orderData['store']?['name'] ?? 'N/A';
    final address = _orderData['full_address'] ?? _orderData['address'] ?? 'N/A';
    final driverName = _orderData['delivery_partner_name'] ?? _orderData['delivery_partner']?['name'] ?? 'Not assigned';
    final assignmentStatus = _orderData['assignment_status'] ?? 'N/A';

    return Scaffold(
      appBar: AppBar(
        title: Text('Order #PVL${widget.orderId}'),
        actions: [
          _statusChip(status),
          const SizedBox(width: 16),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    const Icon(Icons.location_on, color: Colors.blue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _location == null
                          ? const Text('Waiting for live location...')
                          : Text('Lat: ${_location!['lat']?.toStringAsFixed(5)}, Lng: ${_location!['lng']?.toStringAsFixed(5)}'),
                    ),
                    if (_location != null)
                      Text('Updated: ${DateTime.parse(_location!['timestamp']).toLocal().toString().substring(11, 16)}'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: FlutterMap(
                options: MapOptions(
                  initialCenter: _location != null
                      ? LatLng(_location!['lat'] ?? 0.0, _location!['lng'] ?? 0.0)
                      : const LatLng(17.3850, 78.4867),
                  initialZoom: 14,
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.pvlcommerce.admin',
                  ),
                  if (_location != null)
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: LatLng(_location!['lat'] ?? 0.0, _location!['lng'] ?? 0.0),
                          width: 80,
                          height: 80,
                          child: const Icon(Icons.delivery_dining, color: Colors.blue, size: 40),
                        ),
                      ],
                    ),
                  RichAttributionWidget(attributions: [TextSourceAttribution('OpenStreetMap contributors')]),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Customer', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('$customerName | $customerPhone'),
                    const SizedBox(height: 8),
                    const Text('Store', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text(storeName),
                    const SizedBox(height: 8),
                    const Text('Address', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text(address),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Delivery Partner', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text(driverName),
                    Text('Assignment Status: $assignmentStatus'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Items', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ..._items.map((item) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            Text('${item['quantity']}x', style: const TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(width: 8),
                            Expanded(child: Text(item['product_name'] ?? 'Unknown')),
                            Text('₹${_parseDouble(item['price']).toStringAsFixed(2)}'),
                          ],
                        ),
                      );
                    }).toList(),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Financial Summary', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    _summaryRow('Subtotal', subtotal),
                    _summaryRow('Delivery Fee', deliveryFee),
                    _summaryRow('Discount', discount),
                    const Divider(),
                    _summaryRow('Total', total, bold: true),
                    const SizedBox(height: 8),
                    _summaryRow('Payment Method', paymentMethod),
                    _summaryRow('Payment Status', paymentStatus),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Timeline', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    _timelineTile('Order Created', _orderData['created_at']),
                    _timelineTile('Store Accepted', _orderData['confirmed_at']),
                    _timelineTile('Preparing', _orderData['preparing_at']),
                    _timelineTile('Ready for Pickup', _orderData['ready_at']),
                    _timelineTile('Driver Assigned', _orderData['assigned_at']),
                    _timelineTile('Out for Delivery', _orderData['out_for_delivery_at']),
                    _timelineTile('Delivered', _orderData['delivered_at']),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(String label, dynamic value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
          Text(value is num ? '₹${value.toStringAsFixed(2)}' : value.toString(),
              style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }

  Widget _timelineTile(String label, String? timestamp) {
    if (timestamp == null || timestamp.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          const Icon(Icons.circle, size: 8, color: Colors.green),
          const SizedBox(width: 8),
          Text(label),
          const Spacer(),
          Text(DateTime.parse(timestamp).toLocal().toString().substring(0, 16), style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _statusChip(String status) {
    Color bgColor, textColor;
    switch (status.toLowerCase()) {
      case 'delivered':
        bgColor = Colors.green.shade100;
        textColor = Colors.green.shade800;
        break;
      case 'pending':
        bgColor = Colors.orange.shade100;
        textColor = Colors.orange.shade800;
        break;
      case 'cancelled':
        bgColor = Colors.red.shade100;
        textColor = Colors.red.shade800;
        break;
      case 'out_for_delivery':
        bgColor = Colors.blue.shade100;
        textColor = Colors.blue.shade800;
        break;
      default:
        bgColor = Colors.grey.shade200;
        textColor = Colors.grey.shade800;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(12)),
      child: Text(status, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: textColor)),
    );
  }
}