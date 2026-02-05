import 'dart:convert';
import 'package:http/http.dart' as http;

/// HTTP client for the Dancecast server API.
/// Uses the configured server base URL for GET /api/videos and GET /api/displays.
/// Video URLs are built as baseUrl + path (e.g. http://host:8000/videos/0).
class ApiClient {
  ApiClient(this.baseUrl);

  final String baseUrl;

  String get _base => baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;

  /// GET /api/videos — list of { name, path } for the media library.
  Future<List<VideoItem>> getVideos() async {
    final res = await http.get(Uri.parse('$_base/api/videos'));
    if (res.statusCode != 200) throw Exception('Failed to load videos: ${res.statusCode}');
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final list = data['videos'] as List<dynamic>? ?? [];
    return list.map((e) => VideoItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// GET /api/displays — list of registered receiver displays { id, name }.
  Future<List<DisplayItem>> getDisplays() async {
    final res = await http.get(Uri.parse('$_base/api/displays'));
    if (res.statusCode != 200) throw Exception('Failed to load displays: ${res.statusCode}');
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final list = data['displays'] as List<dynamic>? ?? [];
    return list.map((e) => DisplayItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Full URL for a video path returned by the API (e.g. /videos/0 -> http://host:8000/videos/0).
  String videoUrl(String path) {
    if (path.startsWith('http')) return path;
    return path.startsWith('/') ? '$_base$path' : '$_base/$path';
  }
}

class VideoItem {
  VideoItem({required this.name, required this.path});
  final String name;
  final String path;
  static VideoItem fromJson(Map<String, dynamic> j) =>
      VideoItem(name: j['name'] as String? ?? '', path: j['path'] as String? ?? '');
}

class DisplayItem {
  DisplayItem({required this.id, required this.name});
  final String id;
  final String name;
  static DisplayItem fromJson(Map<String, dynamic> j) =>
      DisplayItem(id: j['id'] as String? ?? '', name: j['name'] as String? ?? '');
}
