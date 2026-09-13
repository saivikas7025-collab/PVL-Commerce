import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/address.dart';
import '../providers/address_provider.dart';
import '../services/location_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_ui.dart';

/// Full-screen editor used for both "add address" and "edit address".
class AddressEditorScreen extends StatefulWidget {
  final Address? initial;
  const AddressEditorScreen({super.key, this.initial});

  @override
  State<AddressEditorScreen> createState() => _AddressEditorScreenState();
}

class _AddressEditorScreenState extends State<AddressEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _fullAddress;
  late final TextEditingController _city;
  late final TextEditingController _state;
  late final TextEditingController _pincode;

  String _label = 'Home';
  bool _isDefault = false;
  bool _saving = false;
  String? _error;
  double? _lat;
  double? _lng;
  bool _capturing = false;

  @override
  void initState() {
    super.initState();
    _fullAddress = TextEditingController(text: widget.initial?.fullAddress ?? '');
    _city = TextEditingController(text: widget.initial?.city ?? '');
    _state = TextEditingController(text: widget.initial?.state ?? '');
    _pincode = TextEditingController(text: widget.initial?.pincode ?? '');
    _label = widget.initial?.label ?? 'Home';
    _isDefault = widget.initial?.isDefault ?? false;
    _lat = widget.initial?.latitude;
    _lng = widget.initial?.longitude;
  }

  @override
  void dispose() {
    _fullAddress.dispose();
    _city.dispose();
    _state.dispose();
    _pincode.dispose();
    super.dispose();
  }

  Future<void> _captureLocation() async {
    setState(() => _capturing = true);
    final pos = await LocationService.getCurrentPosition();
    if (!mounted) return;
    setState(() {
      _capturing = false;
      if (pos != null) {
        _lat = pos.latitude;
        _lng = pos.longitude;
      }
    });
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(pos == null
            ? 'Could not read GPS. Please enable location access.'
            : 'Pinned at ${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}'),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final provider = context.read<AddressProvider>();
      final draft = Address(
        id: widget.initial?.id ?? 0,
        userId: widget.initial?.userId ?? 0,
        label: _label,
        fullAddress: _fullAddress.text.trim(),
        city: _city.text.trim(),
        state: _state.text.trim(),
        pincode: _pincode.text.trim(),
        latitude: _lat,
        longitude: _lng,
        isDefault: _isDefault,
      );
      if (widget.initial == null) {
        await provider.add(draft);
      } else {
        await provider.update(widget.initial!.id, draft);
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() =>
            _error = e.toString().replaceFirst('Exception: ', '').replaceFirst('ApiException: ', ''));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.initial == null ? 'Add address' : 'Edit address'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            Wrap(
              spacing: AppSpacing.sm,
              children: ['Home', 'Work', 'Other']
                  .map((l) => ChoiceChip(
                        label: Text(l),
                        selected: _label == l,
                        onSelected: (_) => setState(() => _label = l),
                        selectedColor: AppColors.brandPrimary,
                        labelStyle: TextStyle(
                          color: _label == l ? Colors.white : AppColors.ink,
                          fontWeight: FontWeight.w700,
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: AppSpacing.lg),
            TextFormField(
              controller: _fullAddress,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Flat / House / Street / Area',
                prefixIcon: Icon(Icons.home_outlined),
              ),
              validator: (v) => (v == null || v.trim().isEmpty)
                  ? 'Please add the flat/house and street'
                  : null,
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _city,
                    decoration: const InputDecoration(labelText: 'City'),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'City required' : null,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: TextFormField(
                    controller: _state,
                    decoration: const InputDecoration(labelText: 'State'),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'State required' : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _pincode,
              keyboardType: TextInputType.number,
              maxLength: 10,
              decoration: const InputDecoration(
                labelText: 'Pincode',
                counterText: '',
                prefixIcon: Icon(Icons.pin_drop_outlined),
              ),
              validator: (v) => (v == null || !RegExp(r'^[0-9]{4,10}$').hasMatch(v.trim()))
                  ? 'Enter a valid pincode'
                  : null,
            ),
            const SizedBox(height: AppSpacing.md),
            Card(
              color: _lat != null
                  ? const Color(0xFFE6F4EA)
                  : AppColors.surfaceSecondary,
              child: ListTile(
                leading: Icon(
                  _lat != null
                      ? Icons.location_on_rounded
                      : Icons.location_searching_rounded,
                  color: _lat != null ? AppColors.brandDark : AppColors.inkMuted,
                ),
                title: Text(
                  _lat != null ? 'Location pinned' : 'Pin my current location',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text(
                  _lat != null
                      ? '${_lat!.toStringAsFixed(5)}, ${_lng!.toStringAsFixed(5)}'
                      : 'Required so we can verify your delivery point',
                ),
                trailing: _capturing
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : TextButton(
                        onPressed: _captureLocation,
                        child: Text(_lat != null ? 'Redo' : 'Pin'),
                      ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              value: _isDefault,
              onChanged: (v) => setState(() => _isDefault = v),
              title: const Text('Set as default delivery address'),
            ),
            if (_error != null) ...[
              const SizedBox(height: AppSpacing.md),
              Text(_error!, style: const TextStyle(color: AppColors.error)),
            ],
            const SizedBox(height: AppSpacing.xl),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Text('Save address'),
            ),
          ],
        ),
      ),
    );
  }
}

/// List / manage saved addresses.
class AddressBookScreen extends StatefulWidget {
  final bool selectionMode;
  const AddressBookScreen({super.key, this.selectionMode = false});

  @override
  State<AddressBookScreen> createState() => _AddressBookScreenState();
}

class _AddressBookScreenState extends State<AddressBookScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<AddressProvider>().refresh();
    });
  }

  Future<void> _openEditor([Address? existing]) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AddressEditorScreen(initial: existing),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AddressProvider>();
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.selectionMode ? 'Choose delivery address' : 'Saved addresses'),
      ),
      body: provider.loading && provider.addresses.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : provider.addresses.isEmpty
              ? AppEmptyState(
                  icon: Icons.location_off_outlined,
                  title: 'No addresses yet',
                  message: 'Add your first delivery address to place orders.',
                  actionLabel: 'Add address',
                  onAction: _openEditor,
                )
              : RefreshIndicator(
                  onRefresh: () => provider.refresh(),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    itemCount: provider.addresses.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: AppSpacing.md),
                    itemBuilder: (_, i) {
                      final a = provider.addresses[i];
                      return _AddressCard(
                        address: a,
                        onTap: widget.selectionMode
                            ? () => Navigator.of(context).pop(a)
                            : null,
                        onEdit: () => _openEditor(a),
                        onDelete: () => _confirmDelete(a),
                        onMakeDefault:
                            a.isDefault ? null : () => provider.setDefault(a.id),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openEditor(),
        icon: const Icon(Icons.add_location_alt_outlined),
        label: const Text('Add'),
      ),
    );
  }

  Future<void> _confirmDelete(Address a) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete address?'),
        content: Text('"${a.label} - ${a.fullAddress}" will be removed.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Delete')),
        ],
      ),
    );
    if (ok == true && mounted) {
      await context.read<AddressProvider>().remove(a.id);
    }
  }
}

class _AddressCard extends StatelessWidget {
  final Address address;
  final VoidCallback? onTap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback? onMakeDefault;

  const _AddressCard({
    required this.address,
    required this.onEdit,
    required this.onDelete,
    this.onTap,
    this.onMakeDefault,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                    decoration: BoxDecoration(
                      color: AppColors.brandSoft,
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Text(address.label,
                        style: const TextStyle(
                            color: AppColors.brandDark,
                            fontSize: 11,
                            fontWeight: FontWeight.w800)),
                  ),
                  if (address.isDefault) ...[
                    const SizedBox(width: AppSpacing.sm),
                    const Icon(Icons.star_rounded,
                        size: 18, color: AppColors.warning),
                    const SizedBox(width: 2),
                    const Text('Default',
                        style: TextStyle(
                            fontSize: 12,
                            color: AppColors.inkMuted,
                            fontWeight: FontWeight.w700)),
                  ],
                  const Spacer(),
                  PopupMenuButton<String>(
                    onSelected: (v) {
                      if (v == 'edit') onEdit();
                      if (v == 'delete') onDelete();
                      if (v == 'default') onMakeDefault?.call();
                    },
                    itemBuilder: (_) => [
                      const PopupMenuItem(value: 'edit', child: Text('Edit')),
                      if (onMakeDefault != null)
                        const PopupMenuItem(
                            value: 'default', child: Text('Make default')),
                      const PopupMenuItem(
                          value: 'delete', child: Text('Delete')),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(address.fullAddress,
                  style:
                      const TextStyle(fontWeight: FontWeight.w700, height: 1.4)),
              const SizedBox(height: AppSpacing.xs),
              Text(
                '${address.city}, ${address.state} - ${address.pincode}',
                style: const TextStyle(color: AppColors.inkMuted),
              ),
              if (address.latitude != null && address.longitude != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Row(
                  children: [
                    const Icon(Icons.location_on_rounded,
                        size: 14, color: AppColors.brandDark),
                    const SizedBox(width: 4),
                    Text(
                      '${address.latitude!.toStringAsFixed(4)}, ${address.longitude!.toStringAsFixed(4)}',
                      style: const TextStyle(
                          fontSize: 11, color: AppColors.brandDark),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
