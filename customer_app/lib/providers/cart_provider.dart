import 'package:flutter/foundation.dart';
import '../models/cart.dart' as api;
import '../models/product.dart';
import '../services/auth_service.dart';
import '../services/cart_service.dart';

/// Local cart line item.
///
/// Wraps a [Product] plus a quantity so the UI can stay simple, while
/// the provider handles reconciliation with the backend.
class CartItem {
  final Product product;
  int quantity;
  CartItem(this.product, [this.quantity = 1]);
  double get total => product.price * quantity;
}

/// [CartProvider] keeps a local cart in memory and mirrors every mutation
/// to the backend (`/cart` endpoints) so a signed-in user gets the same
/// basket on every device.
///
/// - When the user is signed out, all changes stay local.
/// - When the user signs in, [hydrate] fetches the server cart and merges it.
/// - Mutations are optimistic: the UI updates immediately, then the server
///   call runs. If it fails, we still keep the local state — the next
///   [hydrate] call will re-sync from source of truth.
class CartProvider extends ChangeNotifier {
  final Map<int, CartItem> _items = {};

  bool _syncing = false;
  String? _lastError;

  List<CartItem> get items => _items.values.toList(growable: false);
  int get itemCount => _items.values.fold(0, (s, i) => s + i.quantity);
  double get subtotal => _items.values.fold(0, (s, i) => s + i.total);
  bool get isSyncing => _syncing;
  String? get lastError => _lastError;

  int quantityFor(Product p) => _items[p.id]?.quantity ?? 0;

  /// Fetch the server-side cart for the signed-in user and replace the
  /// local state with it. Safe to call when signed out (does nothing).
  Future<void> hydrate() async {
    if (!await AuthService.validateSession()) return;
    _syncing = true;
    _lastError = null;
    notifyListeners();
    try {
      final serverItems = await CartService.getCart();
      _items.clear();
      for (final row in serverItems) {
        _items[row.productId] = CartItem(_productFromApi(row), row.quantity);
      }
    } catch (e) {
      _lastError = 'Could not sync your cart. $e';
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }

  /// Add one unit of [p] locally and push the update to the server.
  Future<void> add(Product p) async {
    _items.update(p.id, (i) {
      i.quantity++;
      return i;
    }, ifAbsent: () => CartItem(p));
    notifyListeners();
    await _pushQuantity(p.id, _items[p.id]!.quantity, addIfNew: true);
  }

  /// Remove one unit of [p] locally and push the update to the server.
  Future<void> decrease(Product p) async {
    final line = _items[p.id];
    if (line == null) return;
    if (line.quantity <= 1) {
      _items.remove(p.id);
      notifyListeners();
      await _remove(p.id);
    } else {
      line.quantity--;
      notifyListeners();
      await _pushQuantity(p.id, line.quantity);
    }
  }

  /// Empty the cart locally and on the server.
  Future<void> clear() async {
    _items.clear();
    notifyListeners();
    if (!await AuthService.validateSession()) return;
    try {
      await CartService.clearCart();
    } catch (e) {
      _lastError = 'Could not clear the cart on the server. $e';
      notifyListeners();
    }
  }

  /// Drop all state (used on logout) without touching the server.
  void reset() {
    _items.clear();
    _lastError = null;
    _syncing = false;
    notifyListeners();
  }

  // ---- internal helpers ----

  Future<void> _pushQuantity(int productId, int quantity,
      {bool addIfNew = false}) async {
    if (!await AuthService.validateSession()) return;
    try {
      if (addIfNew && quantity == 1) {
        await CartService.addToCart(productId, quantity: 1);
      } else {
        await CartService.updateQuantity(productId, quantity);
      }
    } catch (e) {
      // Fallback: if update failed because the item doesn't exist yet.
      if (addIfNew) {
        try {
          await CartService.addToCart(productId, quantity: quantity);
          return;
        } catch (_) {}
      }
      _lastError = 'Could not sync the cart change. $e';
      notifyListeners();
    }
  }

  Future<void> _remove(int productId) async {
    if (!await AuthService.validateSession()) return;
    try {
      await CartService.removeFromCart(productId);
    } catch (e) {
      _lastError = 'Could not remove the item on the server. $e';
      notifyListeners();
    }
  }

  /// The API cart row only carries a subset of product fields, so we build
  /// a minimal [Product] just to power the local UI. It never overwrites
  /// a full product loaded elsewhere because [Product] is immutable.
  Product _productFromApi(api.CartItem row) {
    return Product(
      id: row.productId,
      name: row.name,
      description: '',
      unit: row.unit,
      price: row.price,
      originalPrice: null,
      imageUrl: row.imageUrl,
      categoryId: null,
      categoryName: '',
      mainCategory: '',
      subcategory: '',
      isActive: true,
    );
  }
}
