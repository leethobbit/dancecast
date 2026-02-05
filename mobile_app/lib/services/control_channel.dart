import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';

/// WebSocket control channel to the Dancecast server.
/// Flow: connect -> attach(displayId) -> send LOAD/PLAY/PAUSE/SEEK/SET_RATE/SET_LOOP.
/// The server forwards commands to the attached display's WebSocket.
class ControlChannel {
  ControlChannel(this.wsUrl);

  final String wsUrl;
  WebSocketChannel? _channel;
  StreamSubscription? _sub;
  final _incoming = StreamController<Map<String, dynamic>>.broadcast();

  /// Stream of messages from the server (e.g. attached, display_gone, error).
  Stream<Map<String, dynamic>> get incoming => _incoming.stream;

  bool get isActive => _channel != null;

  /// Connect to the server WebSocket (same host as API, path /ws).
  void connect() {
    if (_channel != null) return;
    final uri = Uri.parse(wsUrl.startsWith('http') ? wsUrl.replaceFirst(RegExp(r'^http'), 'ws') : wsUrl);
    _channel = WebSocketChannel.connect(uri);
    _sub = _channel!.stream.listen(
      (data) {
        try {
          final msg = jsonDecode(data as String) as Map<String, dynamic>;
          _incoming.add(msg);
        } catch (_) {}
      },
      onError: (_) => _incoming.add({'type': 'error', 'message': 'Connection error'}),
      onDone: () {
        _channel = null;
        _sub?.cancel();
        _sub = null;
        _incoming.add({'type': 'disconnected'});
      },
    );
  }

  void disconnect() {
    _sub?.cancel();
    _sub = null;
    _channel?.sink.close();
    _channel = null;
  }

  void _send(Map<String, dynamic> msg) {
    _channel?.sink.add(jsonEncode(msg));
  }

  void attach(String displayId) => _send({'type': 'attach', 'displayId': displayId});
  void load(String url, {double? rate, double? loopStart, double? loopEnd}) {
    final m = <String, dynamic>{'type': 'LOAD', 'url': url};
    if (rate != null) m['rate'] = rate;
    if (loopStart != null) m['loopStart'] = loopStart;
    if (loopEnd != null) m['loopEnd'] = loopEnd;
    _send(m);
  }

  void play() => _send({'type': 'PLAY'});
  void pause() => _send({'type': 'PAUSE'});
  void seek(double time) => _send({'type': 'SEEK', 'time': time});
  void setRate(double rate) => _send({'type': 'SET_RATE', 'rate': rate});
  void setLoop(double a, double b) => _send({'type': 'SET_LOOP', 'loopStart': a, 'loopEnd': b});

  void dispose() {
    disconnect();
    _incoming.close();
  }
}
