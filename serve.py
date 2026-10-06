import http.server
import functools
import os

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIRECTORY)

with http.server.ThreadingHTTPServer(("127.0.0.1", 4173), Handler) as httpd:
    httpd.serve_forever()
