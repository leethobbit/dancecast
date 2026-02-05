import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'screens/settings_screen.dart';

/// Root widget: Material app with home (video/display list) and settings (server URL).
class DancecastApp extends StatelessWidget {
  const DancecastApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dancecast',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
      routes: {
        SettingsScreen.routeName: (context) => const SettingsScreen(),
      },
    );
  }
}
