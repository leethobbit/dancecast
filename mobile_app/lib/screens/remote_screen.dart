import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/control_channel.dart';

/// Remote control screen: WebSocket attach to display, send LOAD (if we have a
/// video), then play/pause, seek, speed, loop A–B. User actions map to
/// LOAD/PLAY/PAUSE/SEEK/SET_RATE/SET_LOOP messages sent through the server.
class RemoteScreen extends StatefulWidget {
  const RemoteScreen({
    super.key,
    required this.display,
    required this.serverUrl,
    this.videoPath,
    this.videoName,
  });

  final DisplayItem display;
  final String serverUrl;
  final String? videoPath;
  final String? videoName;

  @override
  State<RemoteScreen> createState() => _RemoteScreenState();
}

class _RemoteScreenState extends State<RemoteScreen> {
  late ControlChannel _channel;
  StreamSubscription<Map<String, dynamic>>? _sub;
  bool _attached = false;
  String? _status;
  String? _error;
  List<VideoItem>? _videos;
  String? _selectedPath;
  String? _selectedName;
  double _sliderValue = 0;
  bool _sliderDragging = false;
  static const _speeds = [0.5, 0.75, 1.0, 1.25, 1.5];
  int _speedIndex = 2;
  double? _loopA;
  double? _loopB;

  @override
  void initState() {
    super.initState();
    _selectedPath = widget.videoPath;
    _selectedName = widget.videoName;
    _connect();
  }

  String get _wsUrl {
    final base = widget.serverUrl.trim();
    if (base.startsWith('https')) return base.replaceFirst('https', 'wss');
    return base.replaceFirst('http', 'ws');
  }

  void _connect() {
    _channel = ControlChannel(_wsUrl);
    _channel.connect();
    _sub = _channel.incoming.listen((msg) {
      if (!mounted) return;
      final type = msg['type'] as String?;
      if (type == 'attached') {
        setState(() {
          _attached = true;
          _status = 'Attached to ${widget.display.name}';
          _error = null;
        });
        if (_selectedPath != null) {
          final client = ApiClient(widget.serverUrl);
          _channel.load(client.videoUrl(_selectedPath!), rate: _speeds[_speedIndex].toDouble());
        }
      } else if (type == 'display_gone' || type == 'disconnected') {
        setState(() {
          _attached = false;
          _status = type == 'display_gone' ? 'Display disconnected' : 'Connection lost';
        });
      } else if (type == 'error') {
        setState(() => _error = msg['message'] as String?);
      }
    });
    _channel.attach(widget.display.id);
  }

  @override
  void dispose() {
    _sub?.cancel();
    _channel.dispose();
    super.dispose();
  }

  Future<void> _loadVideos() async {
    if (_videos != null) return;
    try {
      final client = ApiClient(widget.serverUrl);
      final list = await client.getVideos();
      if (mounted) setState(() => _videos = list);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_selectedPath == null) {
      if (_videos == null) {
        _loadVideos();
        return Scaffold(
          appBar: AppBar(title: Text(widget.display.name)),
          body: const Center(child: CircularProgressIndicator()),
        );
      }
      if (_videos!.isEmpty) {
        return Scaffold(
          appBar: AppBar(title: Text(widget.display.name)),
          body: const Center(child: Text('No videos on server.')),
        );
      }
      return Scaffold(
        appBar: AppBar(title: Text('Select video — ${widget.display.name}')),
        body: ListView.builder(
          itemCount: _videos!.length,
          itemBuilder: (context, i) {
            final v = _videos![i];
            return ListTile(
              title: Text(v.name),
              onTap: () => setState(() {
                _selectedPath = v.path;
                _selectedName = v.name;
                if (_attached) {
                  final client = ApiClient(widget.serverUrl);
                  _channel.load(client.videoUrl(v.path), rate: _speeds[_speedIndex].toDouble());
                }
              }),
            );
          },
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.display.name),
        actions: [
          if (_selectedPath != null)
            IconButton(
              icon: const Icon(Icons.loop),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('A–B Loop'),
                    content: const Text(
                      'Set loop In (A) and Out (B) from current position. '
                      'Not implemented in this build: use the web receiver or future version.',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('OK'),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_status != null) Text(_status!, style: Theme.of(context).textTheme.bodyMedium),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ),
            if (_selectedName != null) Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Video: $_selectedName', style: Theme.of(context).textTheme.titleSmall),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton.filled(
                  icon: const Icon(Icons.play_arrow),
                  onPressed: _attached ? () => _channel.play() : null,
                ),
                const SizedBox(width: 16),
                IconButton.filled(
                  icon: const Icon(Icons.pause),
                  onPressed: _attached ? () => _channel.pause() : null,
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text('Seek (0–2 min range until receiver sends position)', style: TextStyle(fontSize: 12)),
            Slider(
              value: _sliderValue,
              onChanged: _attached
                  ? (v) => setState(() => _sliderValue = v)
                  : null,
              onChangeEnd: _attached
                  ? (v) => _channel.seek(v * 120)
                  : null,
            ),
            const SizedBox(height: 8),
            Text('Speed:', style: Theme.of(context).textTheme.titleSmall),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(_speeds.length, (i) {
                  final s = _speeds[i];
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('${s}x'),
                      selected: _speedIndex == i,
                      onSelected: _attached
                          ? (_) {
                              setState(() => _speedIndex = i);
                              _channel.setRate(s);
                            }
                          : null,
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
