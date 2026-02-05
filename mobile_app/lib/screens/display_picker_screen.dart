import 'package:flutter/material.dart';
import '../services/api_client.dart';
import 'remote_screen.dart';

/// Shown after user taps a video: pick which display to cast to, then open remote
/// and send LOAD for that video.
class DisplayPickerScreen extends StatelessWidget {
  const DisplayPickerScreen({
    super.key,
    required this.video,
    required this.displays,
    required this.serverUrl,
  });

  final VideoItem video;
  final List<DisplayItem> displays;
  final String serverUrl;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Cast "${video.name}" to…')),
      body: ListView.builder(
        itemCount: displays.length,
        itemBuilder: (context, i) {
          final d = displays[i];
          return ListTile(
            title: Text(d.name),
            subtitle: Text(d.id),
            onTap: () {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(
                  builder: (context) => RemoteScreen(
                    display: d,
                    videoPath: video.path,
                    videoName: video.name,
                    serverUrl: serverUrl,
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
