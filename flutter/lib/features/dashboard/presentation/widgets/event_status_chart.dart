import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:eventosapp/features/dashboard/domain/entities/dashboard_entities.dart';

class _StatusBar {
  final String label;
  final int count;
  final Color color;

  const _StatusBar({
    required this.label,
    required this.count,
    required this.color,
  });
}

class EventStatusChart extends StatelessWidget {
  final List<EventSummary> events;
  final double chartHeight;

  const EventStatusChart({
    required this.events,
    this.chartHeight = 200,
    super.key,
  });

  List<_StatusBar> get _statusBars {
    final statuses = [
      _StatusBar(label: 'Cotizado', count: 0, color: const Color(0xFF9CA3AF)),
      _StatusBar(label: 'Confirmado', count: 0, color: const Color(0xFF3B82F6)),
      _StatusBar(label: 'Completado', count: 0, color: const Color(0xFF10B981)),
      _StatusBar(label: 'Cancelado', count: 0, color: const Color(0xFFEF4444)),
    ];

    final keys = ['quoted', 'confirmed', 'completed', 'cancelled'];
    final counts = <String, int>{};
    for (final e in events) {
      counts[e.status] = (counts[e.status] ?? 0) + 1;
    }

    return List.generate(statuses.length, (i) {
      final count = counts[keys[i]] ?? 0;
      return _StatusBar(
        label: statuses[i].label,
        count: count,
        color: statuses[i].color,
      );
    }).where((b) => b.count > 0).toList();
  }

  @override
  Widget build(BuildContext context) {
    final bars = _statusBars;

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Estado de Eventos (Este Mes)',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              'Distribución por estado',
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
            const SizedBox(height: 24),
            if (bars.isEmpty)
              SizedBox(
                height: chartHeight,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.bar_chart_outlined,
                          size: 48, color: Colors.grey[300]),
                      const SizedBox(height: 12),
                      Text(
                        'No hay datos este mes',
                        style: TextStyle(color: Colors.grey[500], fontSize: 14),
                      ),
                    ],
                  ),
                ),
              )
            else
              SizedBox(
                height: chartHeight,
                child: BarChart(
                  BarChartData(
                    alignment: BarChartAlignment.spaceAround,
                    maxY: bars
                            .map((b) => b.count)
                            .reduce((a, b) => a > b ? a : b)
                            .toDouble() *
                        1.25,
                    barTouchData: BarTouchData(
                      enabled: true,
                      touchTooltipData: BarTouchTooltipData(
                        getTooltipItem: (group, groupIndex, rod, rodIndex) {
                          final bar = bars[groupIndex];
                          return BarTooltipItem(
                            '${bar.label}\n${rod.toY.toInt()} evento${rod.toY.toInt() == 1 ? '' : 's'}',
                            TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          );
                        },
                      ),
                    ),
                    titlesData: FlTitlesData(
                      show: true,
                      topTitles: AxisTitles(
                        sideTitles: SideTitles(showTitles: false),
                      ),
                      rightTitles: AxisTitles(
                        sideTitles: SideTitles(showTitles: false),
                      ),
                      leftTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          interval: 1,
                          reservedSize: 28,
                          getTitlesWidget: (value, meta) {
                            if (value == value.floorToDouble() && value >= 0) {
                              return Text(
                                value.toInt().toString(),
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey[600],
                                ),
                              );
                            }
                            return const SizedBox.shrink();
                          },
                        ),
                      ),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 36,
                          getTitlesWidget: (value, meta) {
                            final index = value.toInt();
                            if (index >= 0 && index < bars.length) {
                              return Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Text(
                                  bars[index].label,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey[600],
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              );
                            }
                            return const SizedBox.shrink();
                          },
                        ),
                      ),
                    ),
                    gridData: FlGridData(
                      show: true,
                      drawVerticalLine: false,
                      horizontalInterval: 1,
                      getDrawingHorizontalLine: (value) => FlLine(
                        color: Colors.grey.withOpacity(0.15),
                        strokeWidth: 1,
                      ),
                    ),
                    borderData: FlBorderData(show: false),
                    barGroups: List.generate(bars.length, (i) {
                      return BarChartGroupData(
                        x: i,
                        barRods: [
                          BarChartRodData(
                            toY: bars[i].count.toDouble(),
                            color: bars[i].color,
                            width: 40,
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(6),
                              topRight: Radius.circular(6),
                            ),
                          ),
                        ],
                      );
                    }),
                  ),
                ),
              ),
            if (bars.isNotEmpty) ...[
              const SizedBox(height: 16),
              Wrap(
                spacing: 16,
                runSpacing: 8,
                children: bars
                    .map((b) => _LegendItem(label: b.label, color: b.color))
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final String label;
  final Color color;

  const _LegendItem({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(fontSize: 13, color: Colors.grey[700]),
        ),
      ],
    );
  }
}
