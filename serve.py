#!/usr/bin/env python3
"""
Tiny web server for the Snake project.

Why this exists instead of `python3 -m http.server`:
browsers cache JavaScript aggressively. When a learner changes something
and refreshes, they would often still see the OLD version -- which makes
it look like their change did not work. This server tells the browser
never to cache anything, so every refresh shows the current code.
"""

import http.server
import socketserver
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Tell the browser: never reuse a stored copy of these files.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_head(self):
        # The project has no index.html: the root URL is the game.
        # Codespaces appends query parameters, so compare only the path.
        from urllib.parse import urlsplit, urlunsplit
        parts = urlsplit(self.path)
        if parts.path in ("/", ""):
            self.path = urlunsplit(
                ("", "", "/game.html", parts.query, parts.fragment)
            )

        # Python's built-in handler answers "304 Not Modified" whenever the
        # browser sends an If-Modified-Since header -- which reintroduces the
        # exact caching problem we are trying to kill. Removing those headers
        # before they are inspected forces a full 200 response every time.
        for header in ("If-Modified-Since", "If-None-Match"):
            if header in self.headers:
                del self.headers[header]
        return super().send_head()

    def log_message(self, fmt, *args):
        pass  # keep the terminal quiet and friendly


class ReusableServer(socketserver.TCPServer):
    allow_reuse_address = True


def already_serving():
    """True if something is already answering on our port."""
    import urllib.request
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/game.html", timeout=2):
            return True
    except Exception:
        return False


if __name__ == "__main__":
    # This script is started every time the workspace is attached, so a
    # previous copy is often still running. That is fine: leave it alone
    # and exit quietly instead of crashing on "address already in use".
    if already_serving():
        print(f"Already running on port {PORT}; nothing to do.")
        raise SystemExit(0)

    try:
        with ReusableServer(("", PORT), NoCacheHandler) as httpd:
            print(f"Your game is running on port {PORT}.")
            httpd.serve_forever()
    except OSError as err:
        # Someone grabbed the port between the check and the bind.
        if getattr(err, "errno", None) == 98:
            print(f"Port {PORT} is already in use; leaving the existing server alone.")
            raise SystemExit(0)
        raise
