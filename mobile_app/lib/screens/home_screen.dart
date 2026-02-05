import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/server_config.dart';
import 'settings_screen.dart';
import 'display_picker_screen.dart';
import 'remote_screen.dart';

/// Home: show server URL status, list videos and displays. User picks a video
/// then a display, then we open the remote and send LOAD.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? _serverUrl;
  List<VideoItem> _videos = [];
  List<DisplayItem> _displays = [];
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadUrlAndData();
  }

  Future<void> _loadUrlAndData() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    final url = await getServerUrl();
    if (url == null || url.isEmpty) {
      setState(() {
        _serverUrl = null;
        _loading = false;
        _videos = [];
        _displays = [];
      });
      return;
    }
    setState(() => _serverUrl = url);
    try {
      final client = ApiClient(url);
      final videos = await client.getVideos();
      final displays = await client.getDisplays();
      if (mounted) {
        setState(() {
          _videos = videos;
          _displays = displays;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
          _videos = [];
          _displays = [];
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_serverUrl == null || _serverUrl!.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Dancecast')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Set the server URL in Settings (e.g. http://192.168.1.10:8000).'),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () async {
                    await Navigator.pushNamed(context, SettingsScreen.routeName);
                    _loadUrlAndData();
                  },
                  child: const Text('Settings'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dancecast'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () async {
              await Navigator.pushNamed(context, SettingsScreen.routeName);
              _loadUrlAndData();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadUrlAndData,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Server: $_serverUrl',
                      style: Theme.of(context).textTheme.bodySmall,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Card(
                        color: Theme.of(context).colorScheme.errorContainer,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer)),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    const Text('Videos', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    if (_videos.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('No videos. Add files to the server media folder.'),
                      )
                    else
                      ..._videos.map((v) => ListTile(
                            title: Text(v.name),
                            onTap: () => _onVideoTap(v),
                          )),
                    const SizedBox(height: 24),
                    const Text('Displays', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    if (_displays.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(16),
                        child: Text(
                          'No displays. Open the receiver in a browser on your TV: <server>/receiver/',
                        ),
                      )
                    else
                      ..._displays.map((d) => ListTile(
                            title: Text(d.name),
                            subtitle: Text(d.id),
                            onTap: () => _onDisplayTap(d),
                          )),
                  ],
                ),
              ),
      ),
    );
  }

  void _onVideoTap(VideoItem video) {
    if (_displays.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Open the receiver on your TV first, then refresh.')),
      );
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => DisplayPickerScreen(
          video: video,
          displays: _displays,
          serverUrl: _serverUrl!,
        ),
      ),
    );
  }

  void _onDisplayTap(DisplayItem display) {
    if (_videos.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No videos on the server.')),
      );
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => RemoteScreen(
          display: display,
          videoPath: null,
          videoName: null,
          serverUrl: _serverUrl!,
        ),
      ),
    );
  }
}
