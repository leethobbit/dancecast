import 'package:shared_preferences/shared_preferences.dart';

/// Persists and loads the Dancecast server base URL (e.g. http://192.168.1.10:8000).
/// The Flutter app uses this for all HTTP (videos, displays) and WebSocket (control) calls.
const _keyServerUrl = 'dancecast_server_url';

Future<String?> getServerUrl() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(_keyServerUrl);
}

Future<void> setServerUrl(String url) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_keyServerUrl, url.trim());
}
