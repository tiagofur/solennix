import 'package:hive_flutter/hive_flutter.dart';

class HiveInit {
  static Future<void> init() async {
    await Hive.initFlutter();
  }

  static Future<void> clearAll() async {
    await Hive.deleteBoxFromDisk('auth');
    await Hive.deleteBoxFromDisk('cache');
    await Hive.deleteBoxFromDisk('settings');
  }
}
