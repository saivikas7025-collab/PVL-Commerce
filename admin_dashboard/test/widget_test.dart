import 'package:flutter_test/flutter_test.dart';
import 'package:admin_dashboard/main.dart';

void main() {
  testWidgets('AdminApp renders', (WidgetTester tester) async {
    await tester.pumpWidget(const AdminApp());
    expect(find.byType(AdminApp), findsOneWidget);
  });
}