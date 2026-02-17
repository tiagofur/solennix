class FinanceUtils {
  static const double defaultTaxRate = 16.0;

  static double calculateTax(double totalAmount, {double taxRate = defaultTaxRate}) {
    if (totalAmount <= 0) return 0;
    final divisor = 1 + (taxRate / 100);
    final net = totalAmount / divisor;
    return totalAmount - net;
  }

  static double calculateNetSales(double totalAmount, {double taxRate = defaultTaxRate}) {
    if (totalAmount <= 0) return 0;
    final divisor = 1 + (taxRate / 100);
    return totalAmount / divisor;
  }

  static double calculateProductsSubtotal(List<Map<String, dynamic>> products) {
    return products.fold(0.0, (sum, item) {
      final quantity = (item['quantity'] as num?)?.toDouble() ?? 0;
      final unitPrice = (item['unit_price'] as num?)?.toDouble() ?? 0;
      final discount = (item['discount'] as num?)?.toDouble() ?? 0;
      final lineTotal = quantity * (unitPrice - discount);
      return sum + lineTotal;
    });
  }

  static double calculateExtrasSubtotal(List<Map<String, dynamic>> extras) {
    return extras.fold(0.0, (sum, item) {
      final price = (item['price'] as num?)?.toDouble() ?? 0;
      return sum + price;
    });
  }

  static double applyDiscount(double subtotal, double discountPercent) {
    if (subtotal <= 0 || discountPercent <= 0) return subtotal;
    return subtotal * (1 - (discountPercent / 100));
  }

  static double calculateDeposit(double total, double depositPercent) {
    if (total <= 0 || depositPercent <= 0) return 0;
    return total * (depositPercent / 100);
  }

  static double calculatePaidPercentage(double totalPaid, double totalAmount) {
    if (totalAmount <= 0) return 0;
    return (totalPaid / totalAmount) * 100;
  }
}
