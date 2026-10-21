"""Local preview server for the 3D world edition (no caching, so edits show up immediately).

Usage: python tools/serve_world.py [port] [--lan]
  → serves ./world on http://127.0.0.1:<port>
  --lan also answers other devices on the same network (a phone on the same Wi-Fi): it listens on every interface
        and prints this computer's addresses.  Windows may ask once whether Python may accept connections on private
        networks; allow it there to reach the page from the phone.  Stop with Ctrl-C.
"""
import http.server
import os
import socket
import sys
from functools import partial

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'world')


class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript', '.webp': 'image/webp',
                      '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


def lan_addresses():
    """this computer's IPv4 addresses other than loopback"""
    found = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            found.add(info[4][0])
    except OSError:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('192.0.2.1', 9))   # no packet is sent; this only asks which interface would be used
        found.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    return sorted(a for a in found if not a.startswith('127.'))


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    lan = '--lan' in sys.argv
    port = int(args[0]) if args else 5180
    handler = partial(NoCache, directory=os.path.normpath(ROOT))
    with http.server.ThreadingHTTPServer(('0.0.0.0' if lan else '127.0.0.1', port), handler) as srv:
        print(f'serving {os.path.normpath(ROOT)} on http://127.0.0.1:{port}', flush=True)
        if lan:
            for a in lan_addresses():
                print(f'  on the same network: http://{a}:{port}/', flush=True)
        srv.serve_forever()
