import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:eventosapp/shared/widgets/custom_app_bar.dart';
import 'package:eventosapp/shared/widgets/loading_widget.dart';
import 'package:eventosapp/shared/widgets/error_widget.dart' as app_widgets;
import 'package:eventosapp/features/settings/presentation/providers/settings_provider.dart';
import 'package:eventosapp/features/settings/data/models/user_profile_model.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomAppBar(title: 'Configuración'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _SettingsSection(
            title: 'Cuenta',
            children: [
              _SettingsTile(
                title: 'Perfil',
                subtitle: 'Datos personales y contacto',
                icon: Icons.person_outline,
                onTap: () => context.push('/settings/profile'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _SettingsSection(
            title: 'Negocio',
            children: [
              _SettingsTile(
                title: 'Contrato',
                subtitle: 'Depósito y cancelaciones',
                icon: Icons.description_outlined,
                onTap: () => context.push('/settings/contract'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _SettingsSection(
            title: 'Aplicación',
            children: [
              _SettingsTile(
                title: 'Preferencias',
                subtitle: 'Notificaciones y calendario',
                icon: Icons.tune,
                onTap: () => context.push('/settings/app'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _businessController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isInitialized = false;

  @override
  void dispose() {
    _nameController.dispose();
    _businessController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(settingsProvider);

    if (!_isInitialized && settingsAsync.valueOrNull?.profile != null) {
      _populateFields(settingsAsync.valueOrNull!.profile!);
      _isInitialized = true;
    }

    return Scaffold(
      appBar: const CustomAppBar(title: 'Perfil'),
      body: settingsAsync.when(
        loading: () => const LoadingWidget(message: 'Cargando perfil...'),
        error: (error, stack) => app_widgets.ErrorWidget(
          message: error.toString(),
          onRetry: () => ref.read(settingsProvider.notifier).loadProfile(),
        ),
        data: (_) => Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Nombre'),
                validator: (value) => value == null || value.isEmpty ? 'Requerido' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _businessController,
                decoration: const InputDecoration(labelText: 'Empresa'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(labelText: 'Email'),
                keyboardType: TextInputType.emailAddress,
                enabled: false,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(labelText: 'Teléfono'),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _saveProfile,
                child: const Text('Guardar cambios'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _populateFields(UserProfileModel profile) {
    _nameController.text = profile.name;
    _businessController.text = profile.businessName ?? '';
    _emailController.text = profile.email;
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    final current = ref.read(settingsProvider).valueOrNull?.profile;
    if (current == null) return;

    final updated = current.copyWith(
      name: _nameController.text.trim(),
      businessName: _businessController.text.trim().isEmpty
          ? null
          : _businessController.text.trim(),
    );

    await ref.read(settingsProvider.notifier).saveProfile(updated);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Perfil actualizado')),
      );
    }
  }
}

class ContractSettingsPage extends ConsumerStatefulWidget {
  const ContractSettingsPage({super.key});

  @override
  ConsumerState<ContractSettingsPage> createState() => _ContractSettingsPageState();
}

class _ContractSettingsPageState extends ConsumerState<ContractSettingsPage> {
  final _formKey = GlobalKey<FormState>();
  final _depositController = TextEditingController();
  final _cancellationDaysController = TextEditingController();
  final _refundController = TextEditingController();
  bool _isInitialized = false;

  @override
  void dispose() {
    _depositController.dispose();
    _cancellationDaysController.dispose();
    _refundController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(settingsProvider);

    if (!_isInitialized && settingsAsync.valueOrNull?.profile != null) {
      _populateFields(settingsAsync.valueOrNull!.profile!);
      _isInitialized = true;
    }

    return Scaffold(
      appBar: const CustomAppBar(title: 'Configuración de Contrato'),
      body: settingsAsync.when(
        loading: () => const LoadingWidget(message: 'Cargando contrato...'),
        error: (error, stack) => app_widgets.ErrorWidget(
          message: error.toString(),
          onRetry: () => ref.read(settingsProvider.notifier).loadProfile(),
        ),
        data: (_) => Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextFormField(
                controller: _depositController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Depósito (%)'),
                validator: (value) => value == null || value.isEmpty ? 'Requerido' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _cancellationDaysController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Días de cancelación'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _refundController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Reembolso (%)'),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _saveContractSettings,
                child: const Text('Guardar configuración'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _populateFields(UserProfileModel profile) {
    _depositController.text = (profile.defaultDepositPercent ?? 0).toString();
    _cancellationDaysController.text = (profile.defaultCancellationDays ?? 0).toString();
    _refundController.text = (profile.defaultRefundPercent ?? 0).toString();
  }

  Future<void> _saveContractSettings() async {
    if (!_formKey.currentState!.validate()) return;
    final current = ref.read(settingsProvider).valueOrNull?.profile;
    if (current == null) return;

    final updated = current.copyWith(
      defaultDepositPercent: double.tryParse(_depositController.text.trim()),
      defaultCancellationDays: double.tryParse(_cancellationDaysController.text.trim()),
      defaultRefundPercent: double.tryParse(_refundController.text.trim()),
    );

    await ref.read(settingsProvider.notifier).saveProfile(updated);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Configuración de contrato guardada')),
      );
    }
  }
}

class AppSettingsPage extends ConsumerStatefulWidget {
  const AppSettingsPage({super.key});

  @override
  ConsumerState<AppSettingsPage> createState() => _AppSettingsPageState();
}

class _AppSettingsPageState extends ConsumerState<AppSettingsPage> {
  bool _notificationsEnabled = true;
  bool _calendarSyncEnabled = false;
  bool _compactMode = false;

  String _currency = 'MXN';

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadPreferences);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomAppBar(title: 'Configuración de App'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SwitchListTile(
            value: _notificationsEnabled,
            onChanged: (value) => setState(() => _notificationsEnabled = value),
            title: const Text('Notificaciones'),
            subtitle: const Text('Recibir alertas de eventos y pagos'),
          ),
          SwitchListTile(
            value: _calendarSyncEnabled,
            onChanged: (value) => setState(() => _calendarSyncEnabled = value),
            title: const Text('Sincronizar calendario'),
            subtitle: const Text('Integrar con calendario del dispositivo'),
          ),
          SwitchListTile(
            value: _compactMode,
            onChanged: (value) => setState(() => _compactMode = value),
            title: const Text('Vista compacta'),
            subtitle: const Text('Mostrar listas con menos espacio'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _currency,
            decoration: const InputDecoration(labelText: 'Moneda'),
            items: const [
              DropdownMenuItem(value: 'MXN', child: Text('MXN - Peso mexicano')),
              DropdownMenuItem(value: 'USD', child: Text('USD - Dólar')),
            ],
            onChanged: (value) => setState(() => _currency = value ?? 'MXN'),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _savePreferences,
            child: const Text('Guardar preferencias'),
          ),
        ],
      ),
    );
  }

  Future<void> _loadPreferences() async {
    final data = ref.read(settingsProvider.notifier).loadAppPreferences();
    if (data == null) return;
    setState(() {
      _notificationsEnabled = data['notifications_enabled'] as bool? ?? true;
      _calendarSyncEnabled = data['calendar_sync_enabled'] as bool? ?? false;
      _compactMode = data['compact_mode'] as bool? ?? false;
      _currency = data['currency'] as String? ?? 'MXN';
    });
  }

  Future<void> _savePreferences() async {
    await ref.read(settingsProvider.notifier).saveAppPreferences({
      'notifications_enabled': _notificationsEnabled,
      'calendar_sync_enabled': _calendarSyncEnabled,
      'compact_mode': _compactMode,
      'currency': _currency,
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Preferencias guardadas')),
      );
    }
  }
}

class _SettingsSection extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _SettingsSection({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  const _SettingsTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: Colors.blue.withOpacity(0.1),
        child: Icon(icon, color: Colors.blue),
      ),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}
