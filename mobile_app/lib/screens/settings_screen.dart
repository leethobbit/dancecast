import 'package:flutter/material.dart';
import '../services/server_config.dart';

/// Settings: edit and save the Dancecast server base URL (e.g. http://192.168.1.10:8000).
/// Stored in shared_preferences so it persists across app restarts.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  static const String routeName = '/settings';

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _controller = TextEditingController();
  bool _saved = false;

  @override
  void initState() {
    super.initState();
    _loadUrl();
  }

  Future<void> _loadUrl() async {
    final url = await getServerUrl();
    if (mounted) _controller.text = url ?? '';
  }

  Future<void> _save() async {
    final url = _controller.text.trim();
    if (url.isEmpty) return;
    await setServerUrl(url);
    if (mounted) setState(() => _saved = true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Server URL',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            TextField(
              controller: _controller,
              decoration: const InputDecoration(
                hintText: 'http://192.168.1.10:8000',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.url,
              autocorrect: false,
            ),
            const SizedBox(height: 8),
            Text(
              'The Dancecast server (Docker) must be running. Use your computer or Pi IP and port 8000.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _save,
              child: const Text('Save'),
            ),
            if (_saved)
              const Padding(
                padding: EdgeInsets.only(top: 16),
                child: Text('Saved.', style: TextStyle(color: Colors.green)),
              ),
          ],
        ),
      ),
    );
  }
}
