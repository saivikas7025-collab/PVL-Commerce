import 'package:flutter_test/flutter_test.dart';
import 'package:store_dashboard/main.dart';

void main() {
  testWidgets('Store Dashboard app starts', (WidgetTester tester) async {
    await tester.pumpWidget(const StoreDashboardApp());

    expect(find.text('PVL Commerce'), findsOneWidget);
  });
}
