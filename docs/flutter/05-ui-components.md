# Componentes UI

Componentes reutilizables de la UI para la app Flutter.

## Estado Real de los Widgets

### Widgets en `shared/widgets/` (existen en el codigo)

| Archivo | Clase(s) | Estado |
|---|---|---|
| `custom_app_bar.dart` | `CustomAppBar` | ✅ Implementado |
| `custom_bottom_nav.dart` | `CustomBottomNav` | ✅ Implementado (5 items) |
| `loading_widget.dart` | `LoadingWidget` | ✅ Implementado |
| `error_widget.dart` | `AppErrorWidget` | ✅ Implementado |
| `status_badge.dart` | `StatusBadge` | ✅ Implementado |
| `not_found_page.dart` | `NotFoundPage` | ✅ Implementado |

### Widgets documentados aqui pero NO como archivos separados

Los siguientes son componentes que existen **inline** dentro de las pages (no como archivos separados en `shared/`):
- `EmptyState` — inline en cada page
- `ConfirmDialog` — se usa `AlertDialog` directamente
- `SearchField` — inline en `inventory_page.dart`
- `KPICard` — inline en `dashboard_page.dart`
- `PrimaryButton` — se usa `ElevatedButton` directamente

---


## 🎨 Paleta de Colores

```dart
class AppColors {
  // Brand colors
  static const Color brand = Color(0xFFFF6B35); // Naranja principal
  static const Color brandDark = Color(0xFFE55A2B);
  static const Color brandLight = Color(0xFFFF8C61);

  // Neutral colors
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);
  static const Color gray50 = Color(0xFFF9FAFB);
  static const Color gray100 = Color(0xFFF3F4F6);
  static const Color gray200 = Color(0xFFE5E7EB);
  static const Color gray300 = Color(0xFFD1D5DB);
  static const Color gray400 = Color(0xFF9CA3AF);
  static const Color gray500 = Color(0xFF6B7280);
  static const Color gray600 = Color(0xFF4B5563);
  static const Color gray700 = Color(0xFF374151);
  static const Color gray800 = Color(0xFF1F2937);
  static const Color gray900 = Color(0xFF111827);

  // Status colors
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFFD1FAE5);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFEF3C7);
  static const Color error = Color(0xFFEF4444);
  static const Color errorLight = Color(0xFFFEE2E2);
  static const Color info = Color(0xFF3B82F6);
  static const Color infoLight = Color(0xFFDBEAFE);

  // Dark mode colors
  static const Color darkBackground = Color(0xFF111827);
  static const Color darkSurface = Color(0xFF1F2937);
  static const Color darkBorder = Color(0xFF374151);
}
```

## 📐 Espaciado

```dart
class AppSpacing {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
}
```

## 🔤 Tipografía

```dart
class AppTextStyles {
  static const TextStyle h1 = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  );

  static const TextStyle h2 = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.25,
  );

  static const TextStyle h3 = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
  );

  static const TextStyle h4 = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w600,
  );

  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.normal,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.normal,
  );

  static const TextStyle bodySmall = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.normal,
  );

  static const TextStyle caption = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.normal,
  );
}
```

---

## 🧱 Componentes Base

### CustomAppBar

```dart
/// App bar personalizada con acciones
class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool showBackButton;
  final VoidCallback? onBackPressed;
  final Color? backgroundColor;
  final Color? textColor;

  const CustomAppBar({
    super.key,
    required this.title,
    this.actions,
    this.leading,
    this.showBackButton = true,
    this.onBackPressed,
    this.backgroundColor,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppBar(
      title: Text(
        title,
        style: TextStyle(
          color: textColor ?? theme.appBarTheme.titleTextStyle?.color,
        ),
      ),
      backgroundColor: backgroundColor ?? theme.appBarTheme.backgroundColor,
      elevation: 0,
      leading: leading ??
          (showBackButton
              ? IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: onBackPressed ?? () => Navigator.pop(context),
                )
              : null),
      actions: actions,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
```

### CustomBottomNav

```dart
/// Navegación inferior personalizada
class CustomBottomNav extends ConsumerWidget {
  final int currentIndex;

  const CustomBottomNav({
    super.key,
    required this.currentIndex,
  });

  void _onItemTapped(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go('/dashboard');
        break;
      case 1:
        context.go('/calendar');
        break;
      case 2:
        context.go('/events');
        break;
      case 3:
        context.go('/clients');
        break;
      case 4:
        context.go('/settings');
        break;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: (index) => _onItemTapped(context, index),
      type: BottomNavigationBarType.fixed,
      selectedItemColor: AppColors.brand,
      unselectedItemColor: AppColors.gray400,
      items: const [
        BottomNavigationBarItem(
          icon: Icon(Icons.dashboard_outlined),
          activeIcon: Icon(Icons.dashboard),
          label: 'Inicio',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.calendar_today_outlined),
          activeIcon: Icon(Icons.calendar_today),
          label: 'Calendario',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.event_outlined),
          activeIcon: Icon(Icons.event),
          label: 'Eventos',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.people_outline),
          activeIcon: Icon(Icons.people),
          label: 'Clientes',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.settings_outlined),
          activeIcon: Icon(Icons.settings),
          label: 'Ajustes',
        ),
      ],
    );
  }
}
```

### LoadingWidget

```dart
/// Widget de carga
class LoadingWidget extends StatelessWidget {
  final String? message;
  final bool isFullScreen;

  const LoadingWidget({
    super.key,
    this.message,
    this.isFullScreen = false,
  });

  @override
  Widget build(BuildContext context) {
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation(AppColors.brand),
        ),
        if (message != null) ...[
          const SizedBox(height: AppSpacing.md),
          Text(
            message!,
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.gray600,
            ),
          ),
        ],
      ],
    );

    if (isFullScreen) {
      return Scaffold(
        body: Center(child: content),
      );
    }

    return Center(child: content);
  }
}
```

### ErrorWidget

```dart
/// Widget de error
class ErrorWidget extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  final bool isFullScreen;

  const ErrorWidget({
    super.key,
    required this.message,
    this.onRetry,
    this.isFullScreen = false,
  });

  @override
  Widget build(BuildContext context) {
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Icons.error_outline,
          size: 48,
          color: AppColors.error,
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          message,
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.gray600,
          ),
          textAlign: TextAlign.center,
        ),
        if (onRetry != null) ...[
          const SizedBox(height: AppSpacing.lg),
          ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.brand,
            ),
          ),
        ],
      ],
    );

    if (isFullScreen) {
      return Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Center(child: content),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Center(child: content),
    );
  }
}
```

### EmptyState

```dart
/// Widget de estado vacío
class EmptyState extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  final IconData? icon;

  const EmptyState({
    super.key,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: AppColors.gray100,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon ?? Icons.inbox_outlined,
                size: 64,
                color: AppColors.gray400,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              title,
              style: AppTextStyles.h4.copyWith(
                color: AppColors.gray800,
              ),
              textAlign: TextAlign.center,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                subtitle!,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.gray500,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: AppSpacing.lg),
              ElevatedButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.add),
                label: Text(actionLabel!),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brand,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
```

---

## 📝 Form Components

### SearchField

```dart
/// Campo de búsqueda
class SearchField extends StatefulWidget {
  final String? value;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final String hintText;
  final bool autofocus;
  final TextInputType keyboardType;

  const SearchField({
    super.key,
    this.value,
    this.onChanged,
    this.onSubmitted,
    this.hintText = 'Buscar...',
    this.autofocus = false,
    this.keyboardType = TextInputType.text,
  });

  @override
  State<SearchField> createState() => _SearchFieldState();
}

class _SearchFieldState extends State<SearchField> {
  late final TextEditingController _controller;
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
    _hasText = _controller.text.isNotEmpty;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return TextField(
      controller: _controller,
      autofocus: widget.autofocus,
      keyboardType: widget.keyboardType,
      onChanged: (value) {
        setState(() {
          _hasText = value.isNotEmpty;
        });
        widget.onChanged?.call(value);
      },
      onSubmitted: widget.onSubmitted,
      decoration: InputDecoration(
        hintText: widget.hintText,
        prefixIcon: const Icon(Icons.search),
        suffixIcon: _hasText
            ? IconButton(
                icon: const Icon(Icons.clear),
                onPressed: () {
                  _controller.clear();
                  setState(() {
                    _hasText = false;
                  });
                  widget.onChanged?.call('');
                },
              )
            : null,
        filled: true,
        fillColor: theme.colorScheme.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.md),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
      ),
    );
  }
}
```

### CurrencyInput

```dart
/// Input de moneda formateado
class CurrencyInput extends StatefulWidget {
  final double? value;
  final ValueChanged<double?> onChanged;
  final String? label;
  final String? hintText;
  final bool enabled;

  const CurrencyInput({
    super.key,
    this.value,
    required this.onChanged,
    this.label,
    this.hintText,
    this.enabled = true,
  });

  @override
  State<CurrencyInput> createState() => _CurrencyInputState();
}

class _CurrencyInputState extends State<CurrencyInput> {
  late final TextEditingController _controller;
  late final NumberFormat _currencyFormat;

  @override
  void initState() {
    super.initState();
    _currencyFormat = NumberFormat.currency(
      locale: 'es_MX',
      symbol: '\$',
      decimalDigits: 2,
    );
    _controller = TextEditingController(
      text: widget.value != null
          ? _currencyFormat.format(widget.value!)
          : '',
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return TextField(
      controller: _controller,
      enabled: widget.enabled,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
      ],
      decoration: InputDecoration(
        labelText: widget.label,
        hintText: widget.hintText ?? '\$0.00',
        prefixText: '\$',
        filled: !widget.enabled,
        fillColor: widget.enabled
            ? null
            : theme.disabledColor.withOpacity(0.1),
      ),
      onChanged: (value) {
        final cleanValue = value.replaceAll(RegExp(r'[^\d.]'), '');
        final parsed = double.tryParse(cleanValue);
        widget.onChanged.call(parsed);
      },
    );
  }
}
```

### DatePickerField

```dart
/// Campo selector de fecha
class DatePickerField extends StatelessWidget {
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;
  final String? label;
  final String? hintText;
  final DateTime? firstDate;
  final DateTime? lastDate;
  final bool enabled;

  const DatePickerField({
    super.key,
    this.value,
    required this.onChanged,
    this.label,
    this.hintText,
    this.firstDate,
    this.lastDate,
    this.enabled = true,
  });

  Future<void> _selectDate(BuildContext context) async {
    final selected = await showDatePicker(
      context: context,
      initialDate: value ?? DateTime.now(),
      firstDate: firstDate ?? DateTime(2000),
      lastDate: lastDate ?? DateTime(2100),
      locale: const Locale('es', 'MX'),
      helpText: 'Seleccionar fecha',
      cancelText: 'Cancelar',
      confirmText: 'Aceptar',
    );

    if (selected != null) {
      onChanged(selected);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('d MMMM yyyy', 'es_MX');

    return InkWell(
      onTap: enabled ? () => _selectDate(context) : null,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          hintText: hintText,
          filled: !enabled,
          fillColor: enabled
              ? null
              : theme.disabledColor.withOpacity(0.1),
          suffixIcon: const Icon(Icons.calendar_today),
        ),
        child: Text(
          value != null ? dateFormat.format(value!) : '',
          style: TextStyle(
            color: value != null
                ? theme.colorScheme.onSurface
                : theme.disabledColor,
          ),
        ),
      ),
    );
  }
}
```

---

## 🏷️ Status Components

### StatusBadge

```dart
/// Badge de estado
class StatusBadge extends StatelessWidget {
  final String label;
  final Color backgroundColor;
  final Color textColor;

  const StatusBadge({
    super.key,
    required this.label,
    required this.backgroundColor,
    required this.textColor,
  });

  factory StatusBadge.success(String label) {
    return StatusBadge(
      label: label,
      backgroundColor: AppColors.successLight,
      textColor: AppColors.success,
    );
  }

  factory StatusBadge.warning(String label) {
    return StatusBadge(
      label: label,
      backgroundColor: AppColors.warningLight,
      textColor: AppColors.warning,
    );
  }

  factory StatusBadge.error(String label) {
    return StatusBadge(
      label: label,
      backgroundColor: AppColors.errorLight,
      textColor: AppColors.error,
    );
  }

  factory StatusBadge.info(String label) {
    return StatusBadge(
      label: label,
      backgroundColor: AppColors.infoLight,
      textColor: AppColors.info,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(AppSpacing.sm),
      ),
      child: Text(
        label,
        style: AppTextStyles.bodySmall.copyWith(
          color: textColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
```

---

## 💬 Dialog Components

### ConfirmDialog

```dart
/// Diálogo de confirmación
class ConfirmDialog extends StatelessWidget {
  final String title;
  final String message;
  final String confirmText;
  final String cancelText;
  final VoidCallback onConfirm;
  final Color confirmColor;
  final IconData? icon;

  const ConfirmDialog({
    super.key,
    required this.title,
    required this.message,
    this.confirmText = 'Confirmar',
    this.cancelText = 'Cancelar',
    required this.onConfirm,
    this.confirmColor = AppColors.brand,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          if (icon != null) ...[
            Icon(icon, color: confirmColor),
            const SizedBox(width: AppSpacing.sm),
          ],
          Expanded(child: Text(title)),
        ],
      ),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(cancelText),
        ),
        TextButton(
          onPressed: () {
            onConfirm();
            Navigator.pop(context);
          },
          style: TextButton.styleFrom(
            foregroundColor: confirmColor,
          ),
          child: Text(confirmText),
        ),
      ],
    );
  }

  /// Muestra el diálogo
  static Future<bool?> show(
    BuildContext context, {
    required String title,
    required String message,
    String confirmText = 'Confirmar',
    String cancelText = 'Cancelar',
    required VoidCallback onConfirm,
    Color confirmColor = AppColors.brand,
    IconData? icon,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (context) => ConfirmDialog(
        title: title,
        message: message,
        confirmText: confirmText,
        cancelText: cancelText,
        onConfirm: onConfirm,
        confirmColor: confirmColor,
        icon: icon,
      ),
    );
  }
}
```

---

## 📋 Card Components

### KPICard

```dart
/// Card de KPI para el dashboard
class KPICard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color iconColor;
  final String? subLabel;
  final VoidCallback? onTap;

  const KPICard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.iconColor,
    this.subLabel,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      elevation: 0,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.md),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  color: iconColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.gray500,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      value,
                      style: AppTextStyles.h4.copyWith(
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                    if (subLabel != null) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        subLabel!,
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.gray400,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

## 🔘 Button Components

### PrimaryButton

```dart
/// Botón primario
class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final bool fullWidth;

  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: fullWidth ? double.infinity : null,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.brand,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.gray300,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.md),
          ),
        ),
        child: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(Colors.white),
                ),
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 20),
                    const SizedBox(width: AppSpacing.sm),
                  ],
                  Text(label),
                ],
              ),
      ),
    );
  }
}
```

---

## 📱 Refresh Components

### RefreshIndicator

```dart
/// Indicador de refresh personalizado
class CustomRefreshIndicator extends StatelessWidget {
  final Future<void> onRefresh;
  final Widget child;
  final String? refreshingText;

  const CustomRefreshIndicator({
    super.key,
    required this.onRefresh,
    required this.child,
    this.refreshingText,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AppColors.brand,
      displacement: 40.0,
      strokeWidth: 2.5,
      child: child,
    );
  }
}
```

---

## 🎯 Uso de Componentes

```dart
// Ejemplo de uso
class ExamplePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomAppBar(
        title: 'Ejemplo',
      ),
      body: Column(
        children: [
          // Search field
          const SearchField(
            hintText: 'Buscar...',
          ),

          const SizedBox(height: AppSpacing.md),

          // KPI Card
          KPICard(
            label: 'Ventas',
            value: '\$25,000.00',
            icon: Icons.attach_money,
            iconColor: AppColors.success,
            subLabel: 'Este mes',
          ),

          const SizedBox(height: AppSpacing.md),

          // Primary button
          PrimaryButton(
            label: 'Crear',
            onPressed: () {},
            icon: Icons.add,
            fullWidth: true,
          ),
        ],
      ),
    );
  }
}
```

---

## 📚 Conclusión

Esta biblioteca de componentes UI proporciona:

- ✅ **Consistencia**: Diseño consistente en toda la app
- ✅ **Reutilización**: Componentes reutilizables y parametrizables
- ✅ **Accesibilidad**: Soporte para screen readers y colores de alto contraste
- ✅ **Theming**: Compatible con tema claro y oscuro
- ✅ **Responsividad**: Adaptable a diferentes tamaños de pantalla
- ✅ **Performance**: Widgets optimizados
